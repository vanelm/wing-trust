import forge from 'node-forge';
import { CertificateInfo } from '../types';

// --- TAR Helper Functions ---

function writeString(buffer: Uint8Array, offset: number, str: string, len: number): number {
  let i = 0;
  for (; i < len && i < str.length; i++) {
    buffer[offset + i] = str.charCodeAt(i);
  }
  return offset + len;
}

function writeOctal(buffer: Uint8Array, offset: number, len: number, val: number): number {
  const s = val.toString(8);
  const idx = len - s.length - 1;
  let i = 0;
  for (; i < idx; i++) {
      buffer[offset + i] = 48; // '0'
  }
  for (let j = 0; j < s.length; j++) {
      buffer[offset + i + j] = s.charCodeAt(j);
  }
  buffer[offset + len - 1] = 0; // null termination
  return offset + len;
}

function createTarHeader(filename: string, size: number): Uint8Array {
  const block = new Uint8Array(512);
  let offset = 0;

  offset = writeString(block, offset, filename, 100); // name
  offset = writeOctal(block, offset, 8, 0o644);       // mode
  offset = writeOctal(block, offset, 8, 0o1000);      // uid
  offset = writeOctal(block, offset, 8, 0o1000);      // gid
  offset = writeOctal(block, offset, 12, size);       // size
  offset = writeOctal(block, offset, 12, Math.floor(Date.now() / 1000)); // mtime
  offset = writeString(block, offset, "        ", 8); // chksum placeholder
  block[offset++] = 48; // type (0 = file)
  offset = writeString(block, offset, "", 100);       // linkname
  offset = writeString(block, offset, "ustar", 6);    // ustar indicator
  offset = writeString(block, offset, "00", 2);       // ustar version

  let chksum = 0;
  for (let i = 0; i < 512; i++) chksum += block[i];
  writeOctal(block, 148, 8, chksum);
  
  return block;
}

export const createTarball = (files: { name: string; content: string | Uint8Array }[]): Uint8Array => {
  let totalSize = 0;
  const blocks: Uint8Array[] = [];

  files.forEach(file => {
    const contentBytes = typeof file.content === 'string' 
      ? new TextEncoder().encode(file.content) 
      : file.content;
    
    const header = createTarHeader(file.name, contentBytes.length);
    blocks.push(header);
    blocks.push(contentBytes);

    const padding = 512 - (contentBytes.length % 512);
    if (padding < 512) {
      blocks.push(new Uint8Array(padding));
    }
  });

  blocks.push(new Uint8Array(1024));
  
  totalSize = blocks.reduce((acc, b) => acc + b.length, 0);
  const result = new Uint8Array(totalSize);
  
  let offset = 0;
  blocks.forEach(b => {
    result.set(b, offset);
    offset += b.length;
  });

  return result;
};

// --- TAR Reading Logic ---

interface ExtractedFile {
  name: string;
  content: string; // Assuming text content for certs/keys
  size: number;
}

export const untar = (arrayBuffer: ArrayBuffer): ExtractedFile[] => {
  const files: ExtractedFile[] = [];
  const uint8 = new Uint8Array(arrayBuffer);
  let offset = 0;

  const readString = (start: number, len: number) => {
    let end = start;
    while (end < start + len && uint8[end] !== 0) end++;
    return new TextDecoder().decode(uint8.slice(start, end));
  };

  const readOctal = (start: number, len: number) => {
     const str = readString(start, len);
     return parseInt(str, 8);
  };

  while (offset + 512 <= uint8.length) {
    // Check for end of archive (two null blocks)
    let isNullBlock = true;
    for(let i=0; i<512; i++) {
        if(uint8[offset + i] !== 0) {
            isNullBlock = false;
            break;
        }
    }
    if (isNullBlock) {
        // Check next block to confirm end
        if (offset + 1024 <= uint8.length && uint8[offset + 512] === 0) break;
        // Otherwise skip this padding block
        offset += 512;
        continue;
    }

    const name = readString(offset, 100);
    const size = readOctal(offset + 124, 12);
    const type = String.fromCharCode(uint8[offset + 156]);

    // Calculate next block start
    const contentStart = offset + 512;
    
    if (type === '0' || type === '\0' || type === ' ') {
        const contentBytes = uint8.slice(contentStart, contentStart + size);
        files.push({
            name,
            content: new TextDecoder().decode(contentBytes),
            size
        });
    }

    // Move to next header (size rounded up to 512 blocks)
    offset = contentStart + (Math.ceil(size / 512) * 512);
  }

  return files;
};

// --- X.509 Logic ---

const normalizePem = (pem: string) => {
    if (!pem.includes('-----BEGIN CERTIFICATE-----') && !pem.includes('BEGIN PRIVATE KEY') && !pem.includes('BEGIN RSA PRIVATE KEY')) {
        return `-----BEGIN CERTIFICATE-----\n${pem.trim()}\n-----END CERTIFICATE-----`;
    }
    return pem;
}

export const parseCertificate = (pemOrDer: string): { cert: forge.pki.Certificate; info: CertificateInfo } => {
  let cert: forge.pki.Certificate;
  const pem = normalizePem(pemOrDer);

  try {
    cert = forge.pki.certificateFromPem(pem);
  } catch (e) {
    throw new Error("Invalid Certificate format. Please upload a PEM encoded certificate.");
  }

  const subject = cert.subject.attributes.find(attr => attr.shortName === 'CN' || attr.name === 'commonName');
  const issuer = cert.issuer.attributes.find(attr => attr.shortName === 'CN' || attr.name === 'commonName');
  const org = cert.subject.attributes.find(attr => attr.shortName === 'O' || attr.name === 'organizationName');
  
  const ext = cert.getExtension('1.3.6.1.5.5.7.1.1'); 
  let aiaUrl: string | undefined;
  if (ext) {
      try {
         const val = (ext as any).value; 
         const match = val.match(/http[s]?:\/\/[a-zA-Z0-9./-]+.crt/);
         if (match) {
             aiaUrl = match[0];
         }
      } catch(e) {
          console.warn("Failed to extract AIA URL", e);
      }
  }

  return {
    cert,
    info: {
      commonName: subject?.value as string || 'Unknown',
      organization: org?.value as string || 'Unknown',
      issuer: issuer?.value as string || 'Unknown',
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
      serialNumber: cert.serialNumber,
      raw: forge.pki.certificateToPem(cert),
      aiaUrl,
      fingerprint: forge.md.sha1.create().update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()).digest().toHex()
    }
  };
};

export const checkKeyPair = (certPem: string, keyPem: string): boolean => {
  try {
    const cert = forge.pki.certificateFromPem(normalizePem(certPem));
    const privateKey = forge.pki.privateKeyFromPem(keyPem);
    const certRsa = cert.publicKey as forge.pki.rsa.PublicKey;
    const keyRsa = privateKey as forge.pki.rsa.PrivateKey;
    return certRsa.n.toString(16) === keyRsa.n.toString(16);
  } catch (e) {
    console.error("Key Check Error", e);
    return false;
  }
};

export const verifyParent = (childPem: string, parentPem: string): boolean => {
  try {
    const child = forge.pki.certificateFromPem(normalizePem(childPem));
    const parent = forge.pki.certificateFromPem(normalizePem(parentPem));
    
    try {
        if (child.verify(parent)) {
            return true;
        }
    } catch (verifyError) {
        // Fall through to loose check
    }

    const getDnString = (attrs: any[]) => {
        return attrs.map(a => `${a.shortName}=${a.value}`).sort().join(', ');
    };

    const childIssuerDn = getDnString(child.issuer.attributes);
    const parentSubjectDn = getDnString(parent.subject.attributes);

    return childIssuerDn === parentSubjectDn;
  } catch (e) {
    return false;
  }
};

export const isSelfSigned = (pem: string): boolean => {
  return verifyParent(pem, pem);
};

// Breaks a bundle string into array of PEM strings
export const splitCaBundle = (bundle: string): string[] => {
    const matches = bundle.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
    return matches || [];
};

export const fetchCertificate = async (url: string): Promise<string> => {
    const proxyUrl = 'https://api.allorigins.win/raw?url='; 
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Direct fetch failed');
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = forge.util.createBuffer(arrayBuffer);
        const asn1 = forge.asn1.fromDer(bytes);
        const cert = forge.pki.certificateFromAsn1(asn1);
        return forge.pki.certificateToPem(cert);
    } catch (e) {
        try {
             const response = await fetch(`${proxyUrl}${encodeURIComponent(url)}`);
             const blob = await response.blob();
             const arrayBuffer = await blob.arrayBuffer();
             const bytes = forge.util.createBuffer(arrayBuffer);
             const asn1 = forge.asn1.fromDer(bytes);
             const cert = forge.pki.certificateFromAsn1(asn1);
             return forge.pki.certificateToPem(cert);
        } catch (proxyError) {
            throw new Error(`Could not fetch certificate from ${url}`);
        }
    }
};