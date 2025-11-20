export interface CertificateInfo {
  commonName: string;
  organization: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  raw: string; // PEM
  aiaUrl?: string;
  fingerprint?: string;
}

export interface ChainItem {
  id: string;
  status: 'pending' | 'downloading' | 'success' | 'failed' | 'uploaded';
  info: CertificateInfo;
  source: 'uploaded' | 'fetched' | 'root';
  pem: string;
  isRoot: boolean;
  signsChild: boolean; // true if this cert signs the previous cert in the chain (or leaf if it's first)
}

export interface FileData {
  name: string;
  content: Uint8Array | string;
  type: 'crt' | 'key' | 'ca' | 'tar';
}

export interface SftpCredentials {
  host: string;
  username: string;
  password: string;
  path: string;
  expiresIn: string;
}

export enum AppStep {
  UPLOAD = 0,
  CHAIN_BUILD = 1,
  ANALYSIS = 2,
  PACKAGING = 3,
  DISTRIBUTION = 4
}
