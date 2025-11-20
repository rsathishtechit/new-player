# Quick Release Guide

## ✅ What's Been Set Up

Your project is now configured to build releases for:

- **macOS** (DMG installer + ZIP)
- **Windows** (Setup.exe installer + ZIP)
- **Linux** (DEB + RPM packages)

## 🚀 Create Your First Release

### Step 1: Commit and Push Your Changes

```bash
git add .
git commit -m "Setup multi-platform release workflow"
git push origin master
```

### Step 2: Create and Push a Release Tag

```bash
# Create a new version tag
git tag v1.0.0

# Push the tag to GitHub
git push origin v1.0.0
```

### Step 3: Watch the Magic Happen! ✨

1. Go to your GitHub repository: https://github.com/rsathishtechit/new-player
2. Click on the **Actions** tab
3. You'll see the "Build and Release" workflow running
4. It will build on both macOS and Windows runners (~5-10 minutes)
5. When complete, check the **Releases** section for your new release

## 📦 What Gets Built

### Current Build (macOS only, local):

✅ **out/make/Nilaa Player.dmg** - 110MB
✅ **out/make/zip/darwin/arm64/Nilaa Player-darwin-arm64-1.0.0.zip** - 111MB

### After GitHub Actions (Automatic):

- **macOS:**
  - Nilaa Player.dmg (DMG installer)
  - Nilaa-Player-darwin-arm64-1.0.0.zip (Portable)
- **Windows:**
  - Nilaa-Player-Setup.exe (Windows installer)
  - Nilaa-Player-win32-x64-1.0.0.zip (Portable)

## 🔄 Future Releases

For subsequent releases:

1. Update version:

   ```bash
   npm version patch  # 1.0.0 -> 1.0.1
   # or
   npm version minor  # 1.0.0 -> 1.1.0
   # or
   npm version major  # 1.0.0 -> 2.0.0
   ```

2. Push changes and tag:

   ```bash
   git push && git push --tags
   ```

3. GitHub Actions will automatically build and release! 🎉

## 🛠️ Manual Build (Local)

If you want to build locally:

```bash
# Build for your current platform (macOS)
npm run make

# Output will be in:
# - out/make/Nilaa Player.dmg
# - out/make/zip/darwin/arm64/Nilaa Player-darwin-arm64-1.0.0.zip
```

**Note:** Windows builds require a Windows machine. Use GitHub Actions for cross-platform builds.

## 🐛 Troubleshooting

### If GitHub Actions fails:

1. Check that you have Actions enabled in your repository settings
2. Verify the `GITHUB_TOKEN` has proper permissions
3. Check the Actions logs for specific error messages

### If local build fails:

```bash
# Clean and rebuild
rm -rf node_modules out .vite
npm install
npm run make
```

### If sqlite3 errors occur:

```bash
# Rebuild native modules
npm run postinstall
npm run make
```

## 📝 Notes

- **First-time setup:** GitHub Actions runners may take a few extra minutes to install dependencies
- **macOS builds:** Only build for the current architecture (arm64 on M1/M2/M3, x64 on Intel)
- **Windows builds:** Built on `windows-latest` GitHub runner (x64)
- **Auto-updates:** Squirrel.Windows provides built-in update support for Windows users

## 🎯 Next Steps

1. Test the packaged app locally (already launched for you!)
2. Commit and push your changes
3. Create your first release tag: `git tag v1.0.0 && git push origin v1.0.0`
4. Wait for GitHub Actions to complete
5. Download and test the installers from GitHub Releases
6. Share with users! 🎉
