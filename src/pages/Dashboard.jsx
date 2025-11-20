import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Library, Settings, Play, BookOpen, CheckCircle, Clock, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalVideos: 0,
    completedVideos: 0,
    todayLearning: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    const data = await window.electronAPI.getCourses();
    setCourses(data);
    
    // Calculate stats
    const totalVideos = data.reduce((sum, course) => sum + (course.total_videos || 0), 0);
    const completedVideos = data.reduce((sum, course) => sum + (course.completed_videos || 0), 0);
    
    setStats({
      totalCourses: data.length,
      totalVideos,
      completedVideos,
      todayLearning: 0 // Can be enhanced to track actual time
    });
  };

  const handleAddCourse = async () => {
    const result = await window.electronAPI.openFolder();
    if (result) {
      await loadCourses();
    }
  };

  const handleCourseClick = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  const handleDeleteCourse = async (e, courseId, courseTitle) => {
    e.stopPropagation(); // Prevent triggering course click
    if (confirm(`Are you sure you want to delete "${courseTitle}"? This will remove all videos, progress, and data associated with this course. This action cannot be undone.`)) {
      try {
        await window.electronAPI.deleteCourse(courseId);
        await loadCourses(); // Reload courses after deletion
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Failed to delete course. Please try again.');
      }
    }
  };

  const completionPercentage = stats.totalVideos > 0 
    ? Math.round((stats.completedVideos / stats.totalVideos) * 100) 
    : 0;

  // Get recent courses (last 3)
  const recentCourses = courses.slice(0, 3);
  
  // Get courses with progress for "Continue Watching"
  const continueWatching = courses.filter(c => c.started_videos > 0 && c.started_videos !== c.completed_videos).slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-sm font-medium">Total Courses</span>
            <BookOpen className="w-8 h-8 opacity-30" />
          </div>
          <div className="text-4xl font-bold">{stats.totalCourses}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-100 text-sm font-medium">Total Videos</span>
            <Play className="w-8 h-8 opacity-30" />
          </div>
          <div className="text-4xl font-bold">{stats.totalVideos}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-100 text-sm font-medium">Completed</span>
            <CheckCircle className="w-8 h-8 opacity-30" />
          </div>
          <div className="text-4xl font-bold">{stats.completedVideos}</div>
          <div className="text-green-100 text-sm mt-1">{completionPercentage}% complete</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orange-100 text-sm font-medium">Today's Learning</span>
            <Clock className="w-8 h-8 opacity-30" />
          </div>
          <div className="text-4xl font-bold">0h 0m</div>
          <div className="text-orange-100 text-sm mt-1">Start learning today</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Courses */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Recent Courses</h2>
              {courses.length > 3 && (
                <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                  View All →
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {recentCourses.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Library className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No courses yet</p>
                  <p className="text-sm">Add your first course to get started</p>
                </div>
              ) : (
                recentCourses.map(course => {
                  const progress = course.total_videos > 0 
                    ? (course.completed_videos / course.total_videos) * 100 
                    : 0;
                  
                  return (
                    <div
                      key={course.id}
                      className="w-full flex items-center gap-4 p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-xl transition-all group relative"
                    >
                      <button
                        onClick={() => handleCourseClick(course.id)}
                        className="flex-1 flex items-center gap-4"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Play className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {course.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {course.completed_videos}/{course.total_videos} videos completed
                          </p>
                        </div>
                        <div className="w-32">
                          <div className="w-full bg-gray-600 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => handleDeleteCourse(e, course.id, course.title)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete course"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
            
            <div className="space-y-3">
              <button
                onClick={handleAddCourse}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all group"
              >
                <Plus className="w-5 h-5 text-white" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-white">Add New Course</div>
                  <div className="text-sm text-blue-100">Import videos from a folder</div>
                </div>
              </button>

              <button className="w-full flex items-center gap-4 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition-all group">
                <Library className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-white">Browse Library</div>
                  <div className="text-sm text-gray-400">Explore all your content</div>
                </div>
              </button>

              <button 
                onClick={() => navigate('/settings')}
                className="w-full flex items-center gap-4 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition-all group"
              >
                <Settings className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-white">Settings</div>
                  <div className="text-sm text-gray-400">Customize your experience</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-6">Continue Watching</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {continueWatching.map(course => {
              const progress = course.total_videos > 0 
                ? (course.completed_videos / course.total_videos) * 100 
                : 0;
              
              return (
                <div
                  key={course.id}
                  className="group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700/50 hover:border-blue-500/50 transition-all"
                >
                  <button
                    onClick={() => handleCourseClick(course.id)}
                    className="w-full text-left"
                  >
                    <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                      <Play className="w-16 h-16 text-gray-500 group-hover:text-blue-400 group-hover:scale-110 transition-all" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-400 mb-3">
                        {course.completed_videos}/{course.total_videos} completed
                      </p>
                      <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDeleteCourse(e, course.id, course.title)}
                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Delete course"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
