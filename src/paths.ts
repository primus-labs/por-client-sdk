import fs from 'fs';
import path from 'path';
import isDocker from 'is-docker';

export const getRootDir = () => {
  return isDocker() ? '/app' : ".";
};
export const getConfigFilePath = () => {
  if (process.env.CONFIG_FILE_PATH) {
    return process.env.CONFIG_FILE_PATH;
  }
  return path.join(getRootDir(), '.config.yml');
};

export const getCacheDir = () => {
  if (process.env.CACHE_DIR) {
    return process.env.CACHE_DIR;
  }
  return isDocker() ? '/app/.cache' : './.cache';
};

export const getStateFilePath = () => {
  if (process.env.STATE_FILE_PATH) {
    return process.env.STATE_FILE_PATH;
  }
  return path.join(getCacheDir(), 'state.json');
};

export const getDataDir = () => {
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }
  return isDocker() ? '/app/data' : './data';
};

export const getRequestsPath = () => {
  if (process.env.REQUESTS_PATH) {
    return process.env.REQUESTS_PATH;
  }
  return path.join(getDataDir(), 'requests.json');
};


export const ensureDirectory = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
  return dirPath;
};

export const ensureFile = (filePath: string) => {
  const dir = path.dirname(filePath);
  ensureDirectory(dir);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
    console.log(`📄 Created file: ${filePath}`);
  }
  return filePath;
};

export const initializePaths = () => {
  const paths = {
    configFilePath: getConfigFilePath(),
    cacheDir: getCacheDir(),
    stateFilePath: getStateFilePath(),
    dataDir: getDataDir(),
    isDocker: isDocker()
  };

  ensureDirectory(paths.cacheDir);
  ensureFile(paths.stateFilePath);

  console.log('📂 Paths initialized:');
  console.log(`  -   Is Docker: ${paths.isDocker}`);
  console.log(`  - Config File: ${paths.configFilePath}`);
  console.log(`  -  State File: ${paths.stateFilePath}`);

  return paths;
};

export const paths = initializePaths();
export default paths;
