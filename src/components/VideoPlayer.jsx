import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const VideoPlayer = forwardRef(({ src, onTimeUpdate, onEnded, initialTime = 0, title = '' }, ref) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTitle, setShowTitle] = useState(false);

  // Expose player methods to parent
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => playerRef.current?.currentTime() || 0,
    getDuration: () => playerRef.current?.duration() || 0,
    skip: (seconds) => {
      if (playerRef.current) {
        const newTime = playerRef.current.currentTime() + seconds;
        playerRef.current.currentTime(Math.max(0, Math.min(newTime, playerRef.current.duration())));
      }
    }
  }));

  useEffect(() => {
    if (!playerRef.current) {
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
      });

      // Create custom skip backward button
      const SkipBackButton = videojs.getComponent('Button');
      const skipBackButton = new SkipBackButton(player, {
        clickHandler: function() {
          const newTime = player.currentTime() - 5;
          player.currentTime(Math.max(0, newTime));
        }
      });
      skipBackButton.addClass('vjs-skip-back-button');
      skipBackButton.el().innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 19 2 12 11 5 11 19"></polygon>
          <polygon points="22 19 13 12 22 5 22 19"></polygon>
        </svg>
        <span style="font-size: 10px; position: absolute; bottom: 2px; right: 2px;">5s</span>
      `;
      skipBackButton.el().setAttribute('title', 'Skip back 5 seconds');

      // Create custom skip forward button
      const SkipForwardButton = videojs.getComponent('Button');
      const skipForwardButton = new SkipForwardButton(player, {
        clickHandler: function() {
          const newTime = player.currentTime() + 5;
          player.currentTime(Math.min(newTime, player.duration()));
        }
      });
      skipForwardButton.addClass('vjs-skip-forward-button');
      skipForwardButton.el().innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 19 22 12 13 5 13 19"></polygon>
          <polygon points="2 19 11 12 2 5 2 19"></polygon>
        </svg>
        <span style="font-size: 10px; position: absolute; bottom: 2px; right: 2px;">5s</span>
      `;
      skipForwardButton.el().setAttribute('title', 'Skip forward 5 seconds');

      // Add buttons to control bar (after current time display)
      const controlBar = player.getChild('ControlBar');
      const currentTimeDisplay = controlBar.getChild('CurrentTimeDisplay');
      const currentTimeIndex = controlBar.children().indexOf(currentTimeDisplay);
      
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
        setIsFullscreen(player.isFullscreen());
      });
    } else {
      const player = playerRef.current;
      player.src({ src: `file://${src}`, type: 'video/mp4' });
      if (initialTime > 0) {
        player.currentTime(initialTime);
      }
    }
  }, [src, initialTime]);

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
      {isFullscreen && showTitle && title && (
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
      `}</style>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
