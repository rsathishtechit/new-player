# Release Instructions

## Building Releases

### Prerequisites

- Node.js 20 or higher
- For macOS builds: macOS machine
- For Windows builds: Windows machine
- For Linux builds: Linux machine (or use Docker)

### Local Build

#### Build for your current platform:

```bash
npm run make
```

#### Build for specific platforms (if supported on your OS):

```bash
# macOS
npm run release:mac

# Windows
npm run release:win

# Linux
npm run release:linux
```

The built files will be in the `out/make` directory.

## Creating a GitHub Release

### Automatic Release via GitHub Actions

The project is configured to automatically build and release for both macOS and Windows using GitHub Actions.

#### Method 1: Create a Git Tag (Recommended)

1. Update the version in `package.json`:

   ```bash
   npm version patch  # or minor, major
   ```

2. Push the tag to GitHub:

   ```bash
   git push origin v1.0.0  # replace with your version
   ```

3. GitHub Actions will automatically:
   - Build on macOS and Windows runners
   - Create installers for both platforms
   - Create a GitHub Release with all artifacts

#### Method 2: Manual Trigger

1. Go to your GitHub repository
2. Click on "Actions" tab
3. Select "Build and Release" workflow
4. Click "Run workflow"
5. Enter the version (e.g., `v1.0.0`)
6. Click "Run workflow" button

### What Gets Built

#### macOS:

- **DMG installer** - Recommended for distribution
- **ZIP archive** - Portable version

#### Windows:

- **Setup.exe installer** - Recommended for distribution
- **ZIP archive** - Portable version

### Release Notes

Edit the release notes in the GitHub Release page after it's created, or modify the workflow file `.github/workflows/release.yml` to customize the release body.

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards compatible manner
- **PATCH** version for backwards compatible bug fixes

Use npm commands to update version:

```bash
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

## Troubleshooting

### sqlite3 Native Module Issues

If you get errors about sqlite3 not being found:

1. Rebuild native modules:

   ```bash
   npm run postinstall
   ```

2. Clean and rebuild:
   ```bash
   rm -rf node_modules out
   npm install
   npm run make
   ```

### Platform-Specific Issues

**macOS:**

- Ensure you have Xcode Command Line Tools installed
- For code signing, set up your Apple Developer certificate

**Windows:**

- Visual Studio Build Tools may be required
- Run in PowerShell or CMD with administrator privileges if needed

**Linux:**

- Install build dependencies:
  ```bash
  sudo apt-get install build-essential
  ```

## Publishing to GitHub

Make sure you have a GitHub Personal Access Token with `repo` permissions set as a secret in your repository (Actions secrets). The default `GITHUB_TOKEN` provided by GitHub Actions should work automatically.

## Auto-Updates

The Squirrel.Windows maker includes auto-update functionality. To enable:

1. Each release should be published (not draft)
2. The app will check for updates on startup
3. Update server: GitHub Releases (configured in `forge.config.js`)

For more details on auto-updates, see [Electron Forge Publishing](https://www.electronforge.io/config/publishers).
