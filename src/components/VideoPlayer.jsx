import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const VideoPlayer = forwardRef(({ src, onTimeUpdate, onEnded, initialTime = 0, title = '', onFullscreenChange }, ref) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [settings, setSettings] = useState({
    skipForwardDuration: 5,
    skipBackwardDuration: 5,
    defaultPlaybackSpeed: 1.0,
    defaultVolume: 1.0,
    showTitleInFullscreen: true,
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const skipForward = await window.electronAPI.getSetting('skipForwardDuration');
      const skipBackward = await window.electronAPI.getSetting('skipBackwardDuration');
      const playbackSpeed = await window.electronAPI.getSetting('defaultPlaybackSpeed');
      const volume = await window.electronAPI.getSetting('defaultVolume');
      const showTitle = await window.electronAPI.getSetting('showTitleInFullscreen');

      setSettings({
        skipForwardDuration: skipForward ? parseFloat(skipForward) : 5,
        skipBackwardDuration: skipBackward ? parseFloat(skipBackward) : 5,
        defaultPlaybackSpeed: playbackSpeed ? parseFloat(playbackSpeed) : 1.0,
        defaultVolume: volume ? parseFloat(volume) : 1.0,
        showTitleInFullscreen: showTitle !== 'false',
      });
      setSettingsLoaded(true);
    };
    loadSettings();
  }, []);

  // Expose player methods to parent
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => playerRef.current?.currentTime() || 0,
    getDuration: () => playerRef.current?.duration() || 0,
    skip: (seconds) => {
      if (playerRef.current) {
        const newTime = playerRef.current.currentTime() + seconds;
        playerRef.current.currentTime(Math.max(0, Math.min(newTime, playerRef.current.duration())));
      }
    },
    getSkipForwardDuration: () => settings.skipForwardDuration,
    getSkipBackwardDuration: () => settings.skipBackwardDuration,
    isFullscreen: () => {
      if (playerRef.current) {
        return playerRef.current.isFullscreen();
      }
      return false;
    },
    requestFullscreen: () => {
      if (playerRef.current && !playerRef.current.isFullscreen()) {
        playerRef.current.requestFullscreen();
      }
    },
  }));

  useEffect(() => {
    if (!playerRef.current && settingsLoaded) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add("vjs-big-play-centered");
      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, {
        controls: true,
        fill: true,
        sources: [{
          src: `file://${src}`,
          type: 'video/mp4'
        }]
      }, () => {
        if (initialTime > 0) {
          player.currentTime(initialTime);
        }
        // Apply default playback speed and volume
        if (settings.defaultPlaybackSpeed !== 1.0) {
          player.playbackRate(settings.defaultPlaybackSpeed);
        }
        if (settings.defaultVolume !== 1.0) {
          player.volume(settings.defaultVolume);
        }
      });

      // Create custom skip backward button
      const SkipBackButton = videojs.getComponent('Button');
      const skipBackDuration = settings.skipBackwardDuration;
      const skipBackButton = new SkipBackButton(player, {
        clickHandler: function() {
          const newTime = player.currentTime() - skipBackDuration;
          player.currentTime(Math.max(0, newTime));
        }
      });
      skipBackButton.addClass('vjs-skip-back-button');
      skipBackButton.el().innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 19 2 12 11 5 11 19"></polygon>
          <polygon points="22 19 13 12 22 5 22 19"></polygon>
        </svg>
        <span style="font-size: 10px; position: absolute; bottom: 2px; right: 2px;">${skipBackDuration}s</span>
      `;
      skipBackButton.el().setAttribute('title', `Skip back ${skipBackDuration} seconds`);

      // Create custom skip forward button
      const SkipForwardButton = videojs.getComponent('Button');
      const skipForwardDuration = settings.skipForwardDuration;
      const skipForwardButton = new SkipForwardButton(player, {
        clickHandler: function() {
          const newTime = player.currentTime() + skipForwardDuration;
          player.currentTime(Math.min(newTime, player.duration()));
        }
      });
      skipForwardButton.addClass('vjs-skip-forward-button');
      skipForwardButton.el().innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 19 22 12 13 5 13 19"></polygon>
          <polygon points="2 19 11 12 2 5 2 19"></polygon>
        </svg>
        <span style="font-size: 10px; position: absolute; bottom: 2px; right: 2px;">${skipForwardDuration}s</span>
      `;
      skipForwardButton.el().setAttribute('title', `Skip forward ${skipForwardDuration} seconds`);

      // Remove RemainingTimeDisplay and replace with custom time display
      const controlBar = player.getChild('ControlBar');
      const remainingTimeDisplay = controlBar.getChild('RemainingTimeDisplay');
      if (remainingTimeDisplay) {
        controlBar.removeChild(remainingTimeDisplay);
      }

      // Create custom time display showing "current / total"
      const Component = videojs.getComponent('Component');
      
      class CustomTimeDisplay extends Component {
        constructor(player, options) {
          super(player, options);
          this.updateContent();
          player.on('timeupdate', () => this.updateContent());
          player.on('loadedmetadata', () => this.updateContent());
          player.on('durationchange', () => this.updateContent());
        }
        
        createEl() {
          return videojs.dom.createEl('div', {
            className: 'vjs-time-control vjs-time-display'
          });
        }
        
        updateContent() {
          const currentTime = this.player().currentTime() || 0;
          const duration = this.player().duration();
          
          const formatTime = (seconds) => {
            if (seconds === undefined || seconds === null || isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
              return '0:00';
            }
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (hours > 0) {
              return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${mins}:${secs.toString().padStart(2, '0')}`;
          };
          
          const currentFormatted = formatTime(currentTime);
          const durationFormatted = duration && isFinite(duration) ? formatTime(duration) : '0:00';
          
          this.el().innerHTML = `<span class="vjs-current-time-display">${currentFormatted}</span> / <span class="vjs-duration-display">${durationFormatted}</span>`;
        }
      }
      
      videojs.registerComponent('CustomTimeDisplay', CustomTimeDisplay);
      
      // Add custom time display after current time display
      const currentTimeDisplay = controlBar.getChild('CurrentTimeDisplay');
      const currentTimeIndex = controlBar.children().indexOf(currentTimeDisplay);
      
      // Remove the default CurrentTimeDisplay since we're showing both in custom display
      if (currentTimeDisplay) {
        controlBar.removeChild(currentTimeDisplay);
      }
      
      const customTimeDisplay = new CustomTimeDisplay(player);
      controlBar.addChild(customTimeDisplay, {}, currentTimeIndex);
      
      // Add skip buttons after custom time display
      controlBar.addChild(skipBackButton, {}, currentTimeIndex + 1);
      controlBar.addChild(skipForwardButton, {}, currentTimeIndex + 2);

      player.on('timeupdate', () => {
        onTimeUpdate(player.currentTime());
      });

      player.on('ended', () => {
        onEnded();
      });

      // Listen for fullscreen changes
      player.on('fullscreenchange', () => {
        const isFullscreen = player.isFullscreen();
        setIsFullscreen(isFullscreen);
        if (onFullscreenChange) {
          onFullscreenChange(isFullscreen);
        }
      });
    } else if (playerRef.current) {
      const player = playerRef.current;
      player.src({ src: `file://${src}`, type: 'video/mp4' });
      if (initialTime > 0) {
        player.currentTime(initialTime);
      }
      // Apply default playback speed and volume when changing video
      if (settings.defaultPlaybackSpeed !== 1.0) {
        player.playbackRate(settings.defaultPlaybackSpeed);
      }
      if (settings.defaultVolume !== 1.0) {
        player.volume(settings.defaultVolume);
      }
    }
  }, [src, initialTime, settings, settingsLoaded]);

  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      data-vjs-player 
      className="h-full relative"
      onMouseEnter={() => isFullscreen && setShowTitle(true)}
      onMouseLeave={() => isFullscreen && setShowTitle(false)}
    >
      <div ref={videoRef} className="h-full" />
      {isFullscreen && showTitle && title && settings.showTitleInFullscreen && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6 pointer-events-none z-50">
          <h2 className="text-white text-2xl font-bold">{title}</h2>
        </div>
      )}
      <style jsx>{`
        .vjs-skip-back-button,
        .vjs-skip-forward-button {
          position: relative;
        }
        .vjs-skip-back-button .vjs-icon-placeholder::before,
        .vjs-skip-forward-button .vjs-icon-placeholder::before {
          content: '';
        }
        .video-js {
          height: 100% !important;
        }
        .vjs-time-display {
          font-size: 1em;
          line-height: 3em;
          min-width: 2em;
          width: auto;
          padding-left: 1em;
          padding-right: 1em;
        }
        .vjs-current-time-display,
        .vjs-duration-display {
          display: inline;
        }
      `}</style>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
