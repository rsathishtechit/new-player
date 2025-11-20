const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const {
  AutoUnpackNativesPlugin,
} = require("@electron-forge/plugin-auto-unpack-natives");
const path = require("path");
const fs = require("fs-extra");

module.exports = {
  hooks: {
    packageAfterPrune: async (config, buildPath) => {
      // Copy sqlite3 node_modules to the build
      const sourceNodeModules = path.join(__dirname, "node_modules", "sqlite3");
      const targetNodeModules = path.join(buildPath, "node_modules", "sqlite3");

      if (fs.existsSync(sourceNodeModules)) {
        await fs.copy(sourceNodeModules, targetNodeModules);
        console.log("Copied sqlite3 to build path");
      }
    },
  },
  packagerConfig: {
    asar: {
      unpack: "**/*.{node,dll}",
    },
    executableName: "nilaa-player",
    icon: "./assets/icon", // Will use icon.ico, icon.icns, or icon.png based on platform
    // macOS specific: ensure icon is properly embedded
    ...(process.platform === "darwin" && {
      appBundleId: "com.nilaa.player",
      appCategoryType: "public.app-category.video",
    }),
    // Ignore patterns - most node_modules are bundled by Vite
    // Only sqlite3 is needed at runtime (copied by packageAfterPrune hook)
    ignore: (file) => {
      if (!file) return false;

      // Ignore all node_modules - we'll copy sqlite3 separately in the hook
      if (
        file.includes("/node_modules/") ||
        file.includes("\\node_modules\\")
      ) {
        return true;
      }

      // Ignore development files
      if (file.match(/\.(md|yml|yaml|gitignore|gitattributes)$/)) {
        return true;
      }

      return false;
    },
  },
  rebuildConfig: {
    onlyModules: ["sqlite3"],
    force: true,
  },
  makers: [
    // Windows installers
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "NilaaPlayer",
        authors: "sathish",
        exe: "nilaa-player.exe",
        setupExe: "Nilaa-Player-Setup.exe",
        setupIcon: "./assets/icon.ico",
        iconUrl:
          "https://raw.githubusercontent.com/rsathishtechit/new-player/master/assets/icon.ico",
        loadingGif: "./assets/icon.png",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"],
    },
    // macOS installers
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        format: "ULFO",
        name: "Nilaa Player",
        icon: "./assets/icon.icns",
      },
    },
    // Linux installers
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          icon: "./assets/icon.png",
        },
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {
        options: {
          icon: "./assets/icon.png",
        },
      },
    },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({
      electronRebuildConfig: {
        onlyModules: ["sqlite3"],
        force: true,
      },
    }),
    {
      name: "@electron-forge/plugin-vite",
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: "src/main.js",
            config: "vite.main.config.mjs",
            target: "main",
          },
          {
            entry: "src/preload.js",
            config: "vite.preload.config.mjs",
            target: "preload",
          },
        ],
        renderer: [
          {
            name: "main_window",
            config: "vite.renderer.config.mjs",
          },
        ],
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
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "rsathishtechit",
          name: "new-player",
        },
        prerelease: true,
        draft: false, // Set to false to publish releases (needed for auto-update)
      },
    },
  ],
};
