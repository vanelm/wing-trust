
export const translations = {
  en: {
    // App Header & Modes
    appTitle: "WiNG Trustpoint Forge",
    modeBuilder: "Builder",
    modeValidator: "Validator",
    stepUpload: "UPLOAD",
    stepChain: "CHAIN",
    stepReview: "REVIEW",
    resetConfirm: "Are you sure you want to clear all data and start over?",

    // Theme
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",

    // Builder Section
    sourceFiles: "Source Files",
    subject: "Subject",
    keyMatched: "Key Pair Matched",
    keyMismatch: "Key Mismatch",
    buildChainFirst: "Build Chain First",
    generatePackage: "Generate Package",
    startWorkspace: "Start Your Workspace",
    startWorkspaceDesc: "Upload a certificate and matching private key to begin.",
    chainBuilderTitle: "Chain Builder",
    nextReview: "Next: Review Analysis",
    securityAssessment: "Security Assessment",
    suggestedFilename: "Suggested Filename",
    analyzing: "Analyzing certificate context...",
    artifactsCreated: "Package Artifacts Ready",
    downloadLocal: "Download Local",
    pushSftp: "Push to SFTP",
    uploading: "Uploading...",

    // Validator Section
    validateTitle: "Validate Existing Package",
    validateDesc: "Upload a .tar file to verify certificate integrity, key matching, and chain completeness.",
    
    // File Upload Component
    uploadFile: "Upload File",
    pasteText: "Paste Text",
    dragDrop: "Drag & drop or click to browse",
    contentLoaded: "Content loaded successfully",
    loadText: "Load Text",
    pastePlaceholder: "-----BEGIN... Paste content here...",

    // Cert Viewer
    organization: "Organization",
    issuer: "Issuer",
    validity: "Validity",
    aiaUrl: "AIA URL",
    chainLength: "Chain Length",
    refetchChain: "Re-fetch Chain",
    resolvingChain: "Resolving Chain...",
    notPresent: "Not present",

    // Chain Builder
    chainAssembly: "Certificate Chain Assembly",
    aiaMissing: "The AIA URL is missing or incomplete. Please manually upload the issuer certificates to build the full chain of trust up to the Root CA.",
    leaf: "LEAF",
    rootCa: "Root CA",
    brokenLink: "Broken Link",
    uploadIssuer: "Upload Issuer or Chain Bundle",
    selectCertOrBundle: "Select .crt / .pem / .bundle file",
    uploadCertFor: "Please upload the certificate for:",
    chainComplete: "Chain Complete",
    noNewCerts: "No new certificates found in file.",
    parseError: "Error parsing certificate file.",

    // Package Verifier
    packageDiagnostics: "Package Diagnostics",
    fileIntegrity: "File Integrity",
    chainValidity: "Chain & Validity",
    certKeyPresent: "Certificate & Private Key",
    bothFilesPresent: "Both files present",
    missingFiles: "Missing .crt or .key",
    keyPairMatch: "Key Pair Match",
    modulusMatches: "Modulus matches",
    keysDoNotMatch: "Keys do not match",
    cannotVerify: "Cannot verify",
    chainCompleteness: "Chain Completeness",
    bundleLinksRoot: "Bundle links to Root",
    brokenChain: "Broken or incomplete chain",
    noBundle: "No bundle found",
    expirationStatus: "Expiration Status",
    certExpired: "Certificate Expired",
    checkValidity: "Check Validity",
    validUntil: "Valid until",
    detailedLogs: "Detailed Logs",

    // SFTP Modal
    uploadSuccess: "Upload Successful",
    fileReady: "File is ready for secure distribution.",
    host: "Host",
    username: "Username",
    password: "Password",
    runCommand: "Run this command to download:",
    done: "Done"
  },
  ru: {
    // App Header & Modes
    appTitle: "WiNG Trustpoint Фабрика",
    modeBuilder: "Конструктор",
    modeValidator: "Проверка",
    stepUpload: "ЗАГРУЗКА",
    stepChain: "ЦЕПОЧКА",
    stepReview: "ОБЗОР",
    resetConfirm: "Вы уверены, что хотите очистить все данные и начать заново?",

    // Theme
    theme: "Тема",
    themeLight: "Светлая",
    themeDark: "Тёмная",
    themeSystem: "Системная",

    // Builder Section
    sourceFiles: "Исходные файлы",
    subject: "Субъект",
    keyMatched: "Ключи совпадают",
    keyMismatch: "Несовпадение ключей",
    buildChainFirst: "Сначала соберите цепочку",
    generatePackage: "Создать пакет",
    startWorkspace: "Начните работу",
    startWorkspaceDesc: "Загрузите сертификат и соответствующий закрытый ключ.",
    chainBuilderTitle: "Конструктор цепочки",
    nextReview: "Далее: Анализ",
    securityAssessment: "Оценка безопасности",
    suggestedFilename: "Предлагаемое имя файла",
    analyzing: "Анализ контекста сертификата...",
    artifactsCreated: "Артефакты пакета готовы",
    downloadLocal: "Скачать локально",
    pushSftp: "Отправить на SFTP",
    uploading: "Загрузка...",

    // Validator Section
    validateTitle: "Проверка готового пакета",
    validateDesc: "Загрузите файл .tar для проверки целостности, соответствия ключей и полноты цепочки.",
    
    // File Upload Component
    uploadFile: "Загрузить файл",
    pasteText: "Вставить текст",
    dragDrop: "Перетащите или нажмите для выбора",
    contentLoaded: "Контент успешно загружен",
    loadText: "Загрузить текст",
    pastePlaceholder: "-----BEGIN... Вставьте содержимое здесь...",

    // Cert Viewer
    organization: "Организация",
    issuer: "Издатель",
    validity: "Срок действия",
    aiaUrl: "URL AIA",
    chainLength: "Длина цепочки",
    refetchChain: "Обновить цепочку",
    resolvingChain: "Поиск цепочки...",
    notPresent: "Отсутствует",

    // Chain Builder
    chainAssembly: "Сборка цепочки сертификатов",
    aiaMissing: "URL AIA отсутствует или неполный. Пожалуйста, вручную загрузите сертификаты издателя, чтобы построить полную цепочку доверия до корневого CA.",
    leaf: "ИСТЁК",
    rootCa: "Корневой CA",
    brokenLink: "Связь разорвана",
    uploadIssuer: "Загрузить издателя или цепочку",
    selectCertOrBundle: "Выберите файл .crt / .pem / .bundle",
    uploadCertFor: "Пожалуйста, загрузите сертификат для:",
    chainComplete: "Цепочка собрана",
    noNewCerts: "Новых сертификатов в файле не найдено.",
    parseError: "Ошибка обработки файла сертификата.",

    // Package Verifier
    packageDiagnostics: "Диагностика пакета",
    fileIntegrity: "Целостность файлов",
    chainValidity: "Цепочка и валидность",
    certKeyPresent: "Сертификат и ключ",
    bothFilesPresent: "Оба файла присутствуют",
    missingFiles: "Нет .crt или .key",
    keyPairMatch: "Совпадение пары ключей",
    modulusMatches: "Модули совпадают",
    keysDoNotMatch: "Ключи не совпадают",
    cannotVerify: "Не удалось проверить",
    chainCompleteness: "Полнота цепочки",
    bundleLinksRoot: "Связь с корнем подтверждена",
    brokenChain: "Цепочка разорвана или неполная",
    noBundle: "Бандл не найден",
    expirationStatus: "Статус действия",
    certExpired: "Сертификат истек",
    checkValidity: "Проверьте даты",
    validUntil: "Действует до",
    detailedLogs: "Подробный журнал",

    // SFTP Modal
    uploadSuccess: "Загрузка успешна",
    fileReady: "Файл готов к защищенному распространению.",
    host: "Хост",
    username: "Пользователь",
    password: "Пароль",
    runCommand: "Выполните эту команду для скачивания:",
    done: "Готово"
  }
};

export type Language = 'en' | 'ru';
export type TranslationKey = keyof typeof translations['en'];
