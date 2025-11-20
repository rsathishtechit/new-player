import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Play, CheckCircle, Circle, RotateCcw, PanelRightClose, PanelRightOpen, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import VideoPlayer from '../components/VideoPlayer';
import videojs from 'video.js';

export default function CoursePlayer() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [skipForwardDuration, setSkipForwardDuration] = useState(5);
  const [skipBackwardDuration, setSkipBackwardDuration] = useState(5);
  const sidebarScrollRef = useRef(null);
  const videoItemRefs = useRef({});
  const wasFullscreenRef = useRef(false);

  useEffect(() => {
    loadCourse();
    loadAutoplaySetting();
    loadSkipSettings();
  }, [courseId]);

  const loadSkipSettings = async () => {
    const skipForward = await window.electronAPI.getSetting('skipForwardDuration');
    const skipBackward = await window.electronAPI.getSetting('skipBackwardDuration');
    setSkipForwardDuration(skipForward ? parseFloat(skipForward) : 5);
    setSkipBackwardDuration(skipBackward ? parseFloat(skipBackward) : 5);
  };

  const loadAutoplaySetting = async () => {
    const setting = await window.electronAPI.getSetting('autoplay');
    setAutoplayEnabled(setting === 'true');
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (!playerRef.current) return;

      switch(e.key.toLowerCase()) {
        case 'arrowleft':
          e.preventDefault();
          playerRef.current.skip(-skipBackwardDuration);
          break;
        case 'arrowright':
          e.preventDefault();
          playerRef.current.skip(skipForwardDuration);
          break;
        case 'f':
          e.preventDefault();
          // Trigger VideoJS fullscreen
          const videoElement = document.querySelector('.video-js');
          if (videoElement) {
            const vjsPlayer = videojs.getPlayer(videoElement);
            if (vjsPlayer) {
              if (vjsPlayer.isFullscreen()) {
                vjsPlayer.exitFullscreen();
              } else {
                vjsPlayer.requestFullscreen();
              }
            }
          }
          break;
        case ' ':
        case 'k':
          e.preventDefault();
          // Toggle play/pause - access the internal player
          const vjsPlayer = playerRef.current;
          if (vjsPlayer) {
            const internalPlayer = vjsPlayer.getCurrentTime ? document.querySelector('.video-js') : null;
            if (internalPlayer) {
              const videoElement = internalPlayer.querySelector('video');
              if (videoElement) {
                if (videoElement.paused) {
                  videoElement.play();
                } else {
                  videoElement.pause();
                }
              }
            }
          }
          break;
        case 'arrowup':
          e.preventDefault();
          // Volume up
          const videoUp = document.querySelector('.video-js video');
          if (videoUp) {
            videoUp.volume = Math.min(1, videoUp.volume + 0.1);
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          // Volume down
          const videoDown = document.querySelector('.video-js video');
          if (videoDown) {
            videoDown.volume = Math.max(0, videoDown.volume - 0.1);
          }
          break;
        case 'm':
          e.preventDefault();
          // Toggle mute
          const videoMute = document.querySelector('.video-js video');
          if (videoMute) {
            videoMute.muted = !videoMute.muted;
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeVideo]);

  const loadCourse = async () => {
    const data = await window.electronAPI.getCourse(courseId);
    setCourse(data);
    
    if (data && !activeVideo) {
      // Find the last played video (by last_watched_at or current_time > 0)
      const allVideos = [...data.rootVideos, ...data.sections.flatMap(s => s.videos)];
      
      // Filter videos that have been watched (have progress)
      const watchedVideos = allVideos.filter(v => 
        v.last_watched_at || (v.current_time && v.current_time > 0)
      );
      
      let videoToLoad = null;
      
      if (watchedVideos.length > 0) {
        // Sort by last_watched_at (most recent first), then by current_time
        watchedVideos.sort((a, b) => {
          if (a.last_watched_at && b.last_watched_at) {
            return new Date(b.last_watched_at) - new Date(a.last_watched_at);
          }
          if (a.last_watched_at) return -1;
          if (b.last_watched_at) return 1;
          return (b.current_time || 0) - (a.current_time || 0);
        });
        videoToLoad = watchedVideos[0];
      } else {
        // No watched videos, select first video
        videoToLoad = data.rootVideos[0] || (data.sections[0]?.videos[0]);
      }
      
      if (videoToLoad) {
        setActiveVideo(videoToLoad);
        // Expand the section containing the video
        if (videoToLoad.section_id) {
          setExpandedSections(new Set([videoToLoad.section_id]));
        }
      }
    } else if (data && activeVideo) {
      // If we already have an active video, ensure its section is expanded
      const allVideos = [...data.rootVideos, ...data.sections.flatMap(s => s.videos)];
      const currentVideo = allVideos.find(v => v.id === activeVideo.id);
      if (currentVideo?.section_id) {
        setExpandedSections(prev => new Set([...prev, currentVideo.section_id]));
      }
    }
  };

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleVideoSelect = (video) => {
    setActiveVideo(video);
    // Expand section if video is in a section
    if (video.section_id) {
      setExpandedSections(prev => new Set([...prev, video.section_id]));
    }
  };

  // Scroll active video into view
  useEffect(() => {
    if (activeVideo && sidebarScrollRef.current) {
      // Use a function to retry scrolling if element isn't found immediately
      const scrollToVideo = (retries = 5) => {
        const videoElement = videoItemRefs.current[activeVideo.id];
        if (videoElement) {
          videoElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        } else if (retries > 0) {
          // Retry if element not found (might be in collapsed section or DOM not updated)
          setTimeout(() => scrollToVideo(retries - 1), 100);
        }
      };
      
      // Initial delay to ensure DOM is updated and sections are expanded
      setTimeout(() => scrollToVideo(), 300);
    }
  }, [activeVideo, expandedSections]);

  // Restore fullscreen when video changes if it was previously in fullscreen
  useEffect(() => {
    if (activeVideo && wasFullscreenRef.current && playerRef.current && playerRef.current.requestFullscreen) {
      // Wait for video player to be ready before requesting fullscreen
      const timer = setTimeout(() => {
        if (playerRef.current && !playerRef.current.isFullscreen()) {
          playerRef.current.requestFullscreen();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeVideo]);

  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time);
    if (playerRef.current) {
      setDuration(playerRef.current.getDuration());
    }
    if (activeVideo) {
      window.electronAPI.saveProgress({
        videoId: activeVideo.id,
        courseId: course.id,
        currentTime: time,
        isCompleted: false
      });
    }
  }, [activeVideo, course]);

  const handleVideoEnd = useCallback(() => {
    if (activeVideo) {
      // Check if player is in fullscreen before switching (use the ref method)
      if (playerRef.current && playerRef.current.isFullscreen) {
        wasFullscreenRef.current = playerRef.current.isFullscreen();
      }
      
      window.electronAPI.saveProgress({
        videoId: activeVideo.id,
        courseId: course.id,
        currentTime: activeVideo.duration,
        isCompleted: true
      });
      loadCourse();

      // Autoplay next video if enabled
      if (autoplayEnabled) {
        const allVideos = [...course.rootVideos, ...course.sections.flatMap(s => s.videos)];
        const currentIndex = allVideos.findIndex(v => v.id === activeVideo.id);
        if (currentIndex >= 0 && currentIndex < allVideos.length - 1) {
          const nextVideo = allVideos[currentIndex + 1];
          // Expand section if next video is in a section
          if (nextVideo.section_id) {
            setExpandedSections(prev => new Set([...prev, nextVideo.section_id]));
          }
          // Note: Fullscreen will be restored by the useEffect that watches activeVideo
          setTimeout(() => setActiveVideo(nextVideo), 1000); // Small delay before next video
        }
      }
    }
  }, [activeVideo, course, autoplayEnabled]);

  const toggleAutoplay = async () => {
    const newValue = !autoplayEnabled;
    setAutoplayEnabled(newValue);
    await window.electronAPI.setSetting({ key: 'autoplay', value: newValue.toString() });
  };

  const handleMarkComplete = async () => {
    if (activeVideo) {
      await window.electronAPI.markVideoComplete({ videoId: activeVideo.id, courseId: course.id });
      const updatedCourse = await window.electronAPI.getCourse(courseId);
      setCourse(updatedCourse);
      // Update the active video with the new completion status
      const updatedVideo = [...updatedCourse.rootVideos, ...updatedCourse.sections.flatMap(s => s.videos)]
        .find(v => v.id === activeVideo.id);
      if (updatedVideo) {
        setActiveVideo(updatedVideo);
      }
    }
  };

  const handleResetVideoProgress = async () => {
    if (activeVideo && confirm('Reset progress for this video?')) {
      await window.electronAPI.resetVideoProgress(activeVideo.id);
      const updatedCourse = await window.electronAPI.getCourse(courseId);
      setCourse(updatedCourse);
      // Update the active video with reset progress
      const updatedVideo = [...updatedCourse.rootVideos, ...updatedCourse.sections.flatMap(s => s.videos)]
        .find(v => v.id === activeVideo.id);
      if (updatedVideo) {
        setActiveVideo({ ...updatedVideo, current_time: 0 });
      }
    }
  };

  const handleResetCourseProgress = async () => {
    if (confirm('Reset progress for the entire course? This cannot be undone.')) {
      await window.electronAPI.resetCourseProgress(course.id);
      const updatedCourse = await window.electronAPI.getCourse(courseId);
      setCourse(updatedCourse);
      // Reset active video progress
      if (activeVideo) {
        const updatedVideo = [...updatedCourse.rootVideos, ...updatedCourse.sections.flatMap(s => s.videos)]
          .find(v => v.id === activeVideo.id);
        if (updatedVideo) {
          setActiveVideo({ ...updatedVideo, current_time: 0 });
        }
      }
    }
  };

  const handleMarkVideoComplete = async (video) => {
    await window.electronAPI.markVideoComplete({ videoId: video.id, courseId: course.id });
    const updatedCourse = await window.electronAPI.getCourse(courseId);
    setCourse(updatedCourse);
    // Update active video if it's the one being marked
    if (activeVideo && activeVideo.id === video.id) {
      const updatedVideo = [...updatedCourse.rootVideos, ...updatedCourse.sections.flatMap(s => s.videos)]
        .find(v => v.id === video.id);
      if (updatedVideo) {
        setActiveVideo(updatedVideo);
      }
    }
  };

  const handleDeleteCourse = async () => {
    if (confirm(`Are you sure you want to delete "${course.title}"? This will remove all videos, progress, and data associated with this course. This action cannot be undone.`)) {
      try {
        await window.electronAPI.deleteCourse(course.id);
        navigate('/'); // Navigate back to dashboard after deletion
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Failed to delete course. Please try again.');
      }
    }
  };

  if (!course) return <div className="text-center py-20">Loading course...</div>;

  const allVideos = [...course.rootVideos, ...course.sections.flatMap(s => s.videos)];
  const completedCount = allVideos.filter(v => v.is_completed).length;
  const totalCount = allVideos.length;
  const courseProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link 
          to="/" 
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-white"
        >
          <ChevronDown className="w-5 h-5 rotate-90" />
          <span>Back to Courses</span>
        </Link>
        <h1 className="text-2xl font-bold text-white">{course.title}</h1>
      </div>
      
      <div className={clsx("grid gap-6 h-[calc(100vh-180px)]", sidebarVisible ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1")}>
        <div className={clsx("flex flex-col h-full gap-4", sidebarVisible ? "lg:col-span-2" : "col-span-1")}>
          <div className="bg-black rounded-xl overflow-hidden shadow-2xl flex-1 relative">
          {activeVideo ? (
            <VideoPlayer 
              ref={playerRef}
              key={activeVideo.id}
              src={activeVideo.path}
              title={activeVideo.title}
              initialTime={activeVideo.current_time || 0}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnd}
              onFullscreenChange={(isFullscreen) => {
                wasFullscreenRef.current = isFullscreen;
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a video to start watching
            </div>
          )}
          {/* Toggle sidebar button */}
          <button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg transition-all z-10"
            title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
          >
            {sidebarVisible ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </button>
        </div>
        <div className="space-y-3">
          {activeVideo && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleMarkComplete}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Mark Complete
              </button>
              <button
                onClick={handleResetVideoProgress}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Video
              </button>
              <button
                onClick={handleResetCourseProgress}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Course
              </button>
            </div>
          )}
          <div className="pt-2 border-t border-gray-700">
            <button
              onClick={handleDeleteCourse}
              className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 hover:border-red-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
              Delete Course
            </button>
          </div>
          <div>
            {activeVideo && duration > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{activeVideo.title}</h2>
                  <span className="text-sm text-gray-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-gray-400">
                {completedCount} / {totalCount} videos completed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32 bg-gray-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500"
                  style={{ width: `${courseProgress}%` }}
                />
              </div>
              <span className="text-gray-400 font-medium">{courseProgress}%</span>
            </div>
          </div>
          </div>
        </div>

        {sidebarVisible && (
          <div className="bg-gray-800 rounded-xl overflow-hidden flex flex-col h-full max-h-full">
            <div className="p-4 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">Course Content</h3>
                <button
                  onClick={toggleAutoplay}
                  className={clsx(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                    autoplayEnabled 
                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  )}
                  title="Toggle autoplay next video"
                >
                  Autoplay: {autoplayEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Keyboard: ← → (skip {skipBackwardDuration}s/{skipForwardDuration}s) • F (fullscreen) • Space/K (play/pause) • ↑ ↓ (volume) • M (mute)
              </p>
            </div>
            <div ref={sidebarScrollRef} className="overflow-y-auto flex-1 p-2 space-y-1">
              {/* Root Videos */}
              {course.rootVideos.map(video => (
                <VideoItem 
                  key={video.id} 
                  video={video} 
                  isActive={activeVideo?.id === video.id}
                  onSelect={() => handleVideoSelect(video)}
                  onMarkComplete={handleMarkVideoComplete}
                  videoRef={(el) => videoItemRefs.current[video.id] = el}
                />
              ))}

              {/* Sections */}
              {course.sections.map(section => (
                <div key={section.id} className="mb-2">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                  >
                    {expandedSections.has(section.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="font-medium text-sm text-gray-300">{section.title}</span>
                    <span className="ml-auto text-xs text-gray-500">{section.videos.length} videos</span>
                  </button>
                  
                  {expandedSections.has(section.id) && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-2">
                      {section.videos.map(video => (
                        <VideoItem 
                          key={video.id} 
                          video={video} 
                          isActive={activeVideo?.id === video.id}
                          onSelect={() => handleVideoSelect(video)}
                          onMarkComplete={handleMarkVideoComplete}
                          videoRef={(el) => videoItemRefs.current[video.id] = el}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VideoItem({ video, isActive, onSelect, onMarkComplete, videoRef }) {
  const handleMarkComplete = (e) => {
    e.stopPropagation(); // Prevent triggering video selection
    onMarkComplete(video);
  };

  return (
    <div 
      ref={videoRef}
      className={clsx(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-all group",
        isActive ? "bg-blue-600 text-white shadow-lg" : "hover:bg-gray-700 text-gray-300"
      )}
    >
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-3 text-left"
      >
        <div className={clsx("shrink-0", isActive ? "text-white" : "text-gray-500 group-hover:text-gray-300")}>
          {video.is_completed ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Play className="w-4 h-4" />}
        </div>
        <span className="text-sm font-medium line-clamp-2">{video.title}</span>
      </button>
      {!video.is_completed && (
        <button
          onClick={handleMarkComplete}
          className={clsx(
            "shrink-0 p-1 rounded transition-colors opacity-0 group-hover:opacity-100",
            isActive ? "hover:bg-blue-700" : "hover:bg-gray-600"
          )}
          title="Mark as complete"
        >
          <CheckCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
