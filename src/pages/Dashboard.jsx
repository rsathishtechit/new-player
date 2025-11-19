import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Play, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

export default function Dashboard() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    const data = await window.electronAPI.getCourses();
    setCourses(data);
  };

  const handleAddCourse = async () => {
    await window.electronAPI.openFolder();
    loadCourses();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Your Courses</h1>
        <button
          onClick={handleAddCourse}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Add Course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-xl mb-4">No courses added yet.</p>
          <p>Click "Add Course" to import a folder with video files.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/course/${course.id}`}
              className="block bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all group"
            >
              <div className="h-40 bg-gray-700 flex items-center justify-center relative">
                <Play className="w-12 h-12 text-gray-500 group-hover:text-white transition-colors" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${(course.completed_videos / course.total_videos) * 100}%` }}
                  />
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold mb-2 line-clamp-1" title={course.title}>
                  {course.title}
                </h3>
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>{course.total_videos} videos</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle className={clsx("w-4 h-4", course.completed_videos === course.total_videos ? "text-green-500" : "text-gray-600")} />
                    <span>{Math.round((course.completed_videos / course.total_videos) * 100) || 0}%</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
