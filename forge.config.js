const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { AutoUnpackNativesPlugin } = require('@electron-forge/plugin-auto-unpack-natives');
const fs = require('fs');
const path = require('path');

module.exports = {
  packagerConfig: {
    asar: {
      unpack: ['*.{node,dll}', '**/node_modules/electron-updater/**'],
    },
    afterCopy: [
      async (buildPath, electronVersion, platform, arch) => {
        // Copy electron-updater to build directory so it's included in the asar
        const srcPath = path.join(__dirname, 'node_modules', 'electron-updater');
        const destPath = path.join(buildPath, 'node_modules', 'electron-updater');
        
        if (fs.existsSync(srcPath)) {
          if (!fs.existsSync(path.dirname(destPath))) {
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
          }
          if (fs.existsSync(destPath)) {
            fs.rmSync(destPath, { recursive: true, force: true });
          }
          fs.cpSync(srcPath, destPath, { recursive: true });
          console.log('✓ Copied electron-updater to build directory (will be in asar)');
        }
      },
    ],
    executableName: 'nilaa-player',
    icon: './assets/icon', // Will use icon.ico, icon.icns, or icon.png based on platform
    // macOS specific: ensure icon is properly embedded
    ...(process.platform === 'darwin' && {
      appBundleId: 'com.nilaa.player',
      appCategoryType: 'public.app-category.video',
    }),
  },
  rebuildConfig: {
    onlyModules: ['sqlite3'],
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        name: 'Nilaa Player',
        icon: './assets/icon.icns'
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({
      electronRebuildConfig: {
        onlyModules: ['sqlite3'],
        force: true,
      },
    }),
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'src/main.js',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
      hooks: {
        packageAfterCopy: async (config, buildPath) => {
          // Copy electron-updater to the packaged app's node_modules
          // This runs after files are copied but before asar is created
          const srcPath = path.join(__dirname, 'node_modules', 'electron-updater');
          const destPath = path.join(buildPath, 'node_modules', 'electron-updater');
          
          if (fs.existsSync(srcPath)) {
            if (!fs.existsSync(path.dirname(destPath))) {
              fs.mkdirSync(path.dirname(destPath), { recursive: true });
            }
            if (fs.existsSync(destPath)) {
              fs.rmSync(destPath, { recursive: true, force: true });
            }
            fs.cpSync(srcPath, destPath, { recursive: true });
            console.log('✓ Copied electron-updater to packaged app (will be in asar)');
          }
        },
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'rsathishtechit',
          name: 'new-player'
        },
        prerelease: false,
        draft: false // Set to false to publish releases (needed for auto-update)
      }
    }
  ],
  hooks: {
    prePackage: async (config) => {
      // Copy electron-updater to .vite/build/node_modules before packaging
      // This ensures it's included in the asar
      const buildPath = path.join(__dirname, '.vite', 'build');
      const srcPath = path.join(__dirname, 'node_modules', 'electron-updater');
      const destPath = path.join(buildPath, 'node_modules', 'electron-updater');
      
      // Wait a bit for build directory to be ready
      let retries = 10;
      while (!fs.existsSync(buildPath) && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries--;
      }
      
      if (fs.existsSync(srcPath) && fs.existsSync(buildPath)) {
        if (!fs.existsSync(path.dirname(destPath))) {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
        }
        if (fs.existsSync(destPath)) {
          fs.rmSync(destPath, { recursive: true, force: true });
        }
        fs.cpSync(srcPath, destPath, { recursive: true });
        console.log('✓ Copied electron-updater to build directory');
      }
    },
  },
};
