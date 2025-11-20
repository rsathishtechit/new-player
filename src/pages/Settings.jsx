import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  SkipForward,
  SkipBack,
  Volume2,
  Play,
  Monitor,
  Zap,
} from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    skipForwardDuration: 5,
    skipBackwardDuration: 5,
    defaultPlaybackSpeed: 1.0,
    defaultVolume: 1.0,
    autoplay: true,
    showTitleInFullscreen: true,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const skipForward = await window.electronAPI.getSetting(
      "skipForwardDuration"
    );
    const skipBackward = await window.electronAPI.getSetting(
      "skipBackwardDuration"
    );
    const playbackSpeed = await window.electronAPI.getSetting(
      "defaultPlaybackSpeed"
    );
    const volume = await window.electronAPI.getSetting("defaultVolume");
    const autoplay = await window.electronAPI.getSetting("autoplay");
    const showTitle = await window.electronAPI.getSetting(
      "showTitleInFullscreen"
    );

    setSettings({
      skipForwardDuration: skipForward ? parseFloat(skipForward) : 5,
      skipBackwardDuration: skipBackward ? parseFloat(skipBackward) : 5,
      defaultPlaybackSpeed: playbackSpeed ? parseFloat(playbackSpeed) : 1.0,
      defaultVolume: volume ? parseFloat(volume) : 1.0,
      autoplay: autoplay === "true",
      showTitleInFullscreen: showTitle !== "false", // Default to true
    });
  };

  const handleSave = async () => {
    await window.electronAPI.setSetting({
      key: "skipForwardDuration",
      value: settings.skipForwardDuration.toString(),
    });
    await window.electronAPI.setSetting({
      key: "skipBackwardDuration",
      value: settings.skipBackwardDuration.toString(),
    });
    await window.electronAPI.setSetting({
      key: "defaultPlaybackSpeed",
      value: settings.defaultPlaybackSpeed.toString(),
    });
    await window.electronAPI.setSetting({
      key: "defaultVolume",
      value: settings.defaultVolume.toString(),
    });
    await window.electronAPI.setSetting({
      key: "autoplay",
      value: settings.autoplay.toString(),
    });
    await window.electronAPI.setSetting({
      key: "showTitleInFullscreen",
      value: settings.showTitleInFullscreen.toString(),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    if (confirm("Reset all settings to default values?")) {
      setSettings({
        skipForwardDuration: 5,
        skipBackwardDuration: 5,
        defaultPlaybackSpeed: 1.0,
        defaultVolume: 1.0,
        autoplay: true,
        showTitleInFullscreen: true,
      });
      await handleSave();
    }
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Video Player Settings */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-6">
            <Monitor className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Video Player</h2>
          </div>

          <div className="space-y-6">
            {/* Skip Duration Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SkipForward className="w-5 h-5 text-gray-400" />
                <label className="text-white font-medium flex-1">
                  Skip Forward Duration (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  step="1"
                  value={settings.skipForwardDuration}
                  onChange={(e) =>
                    updateSetting(
                      "skipForwardDuration",
                      parseFloat(e.target.value) || 5
                    )
                  }
                  className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <SkipBack className="w-5 h-5 text-gray-400" />
                <label className="text-white font-medium flex-1">
                  Skip Backward Duration (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  step="1"
                  value={settings.skipBackwardDuration}
                  onChange={(e) =>
                    updateSetting(
                      "skipBackwardDuration",
                      parseFloat(e.target.value) || 5
                    )
                  }
                  className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Playback Speed */}
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5 text-gray-400" />
              <label className="text-white font-medium flex-1">
                Default Playback Speed
              </label>
              <select
                value={settings.defaultPlaybackSpeed}
                onChange={(e) =>
                  updateSetting(
                    "defaultPlaybackSpeed",
                    parseFloat(e.target.value)
                  )
                }
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1.0">1.0x (Normal)</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="1.75">1.75x</option>
                <option value="2.0">2.0x</option>
              </select>
            </div>

            {/* Default Volume */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-gray-400" />
                <label className="text-white font-medium flex-1">
                  Default Volume: {Math.round(settings.defaultVolume * 100)}%
                </label>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.defaultVolume}
                onChange={(e) =>
                  updateSetting("defaultVolume", parseFloat(e.target.value))
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Show Title in Fullscreen */}
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-gray-400" />
              <label className="text-white font-medium flex-1">
                Show Video Title in Fullscreen
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showTitleInFullscreen}
                  onChange={(e) =>
                    updateSetting("showTitleInFullscreen", e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Playback Settings */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-6">
            <Play className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Playback</h2>
          </div>

          <div className="space-y-4">
            {/* Autoplay */}
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-gray-400" />
              <label className="text-white font-medium flex-1">
                Autoplay Next Video
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoplay}
                  onChange={(e) => updateSetting("autoplay", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-sm text-gray-400 ml-8">
              Automatically play the next video when the current one ends
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-white transition-colors"
          >
            <Save className="w-5 h-5" />
            {saved ? "Saved!" : "Save Settings"}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Reset to Defaults
          </button>
        </div>

        {saved && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm">
            Settings saved successfully!
          </div>
        )}

      </div>
    </div>
  );
}
