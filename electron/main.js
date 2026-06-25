const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Data file lives in the user's AppData folder ──────────────────────────────
const DATA_DIR  = app.getPath('userData');
const DATA_FILE = path.join(DATA_DIR, 'budget-data.json');

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) { console.error('Read error:', e); }
  return null;
}

function writeData(data) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Write error:', e);
    return false;
  }
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('data:load', () => readData());
ipcMain.handle('data:save', (_, data) => writeData(data));
ipcMain.handle('data:path', () => DATA_FILE);

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: 'H&L Budget',
    backgroundColor: '#F7F6F3',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Custom titlebar feel
    titleBarStyle: 'default',
    show: false,
  });

  win.loadFile('index.html');

  win.once('ready-to-show', () => win.show());

  // Open external links in the default browser, not Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
