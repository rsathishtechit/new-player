import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  CheckCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Library,
} from "lucide-react";

const COURSES_PER_PAGE = 12;

export default function CourseLibrary() {
  const [courses, setCourses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getCourses();
      setCourses(data);
    } catch (error) {
      console.error("Error loading courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  const handleDeleteCourse = async (e, courseId, courseTitle) => {
    e.stopPropagation();
    if (
      confirm(
        `Are you sure you want to delete "${courseTitle}"? This will remove all videos, progress, and data associated with this course. This action cannot be undone.`
      )
    ) {
      try {
        await window.electronAPI.deleteCourse(courseId);
        const updatedCourses = courses.filter((c) => c.id !== courseId);
        setCourses(updatedCourses);
        // Adjust page if current page becomes empty
        const totalPages = Math.ceil(updatedCourses.length / COURSES_PER_PAGE);
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages);
        }
      } catch (error) {
        console.error("Error deleting course:", error);
        alert("Failed to delete course. Please try again.");
        // Reload courses on error to ensure consistency
        await loadCourses();
      }
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(courses.length / COURSES_PER_PAGE);
  const startIndex = (currentPage - 1) * COURSES_PER_PAGE;
  const endIndex = startIndex + COURSES_PER_PAGE;
  const currentCourses = courses.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Course Library</h1>
        <p className="text-gray-400">
          {courses.length} {courses.length === 1 ? "course" : "courses"} total
        </p>
      </div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div className="text-center py-20">
          <Library className="w-24 h-24 mx-auto mb-6 text-gray-600 opacity-50" />
          <h2 className="text-2xl font-semibold text-white mb-2">
            No courses yet
          </h2>
          <p className="text-gray-400 mb-6">
            Add your first course to get started
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {currentCourses.map((course) => {
              const progress =
                course.total_videos > 0
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
                    <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative">
                      <Play className="w-16 h-16 text-gray-500 group-hover:text-blue-400 group-hover:scale-110 transition-all" />
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                        {course.total_videos || 0} videos
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-400">
                          {course.completed_videos || 0}/
                          {course.total_videos || 0} completed
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {Math.round(progress)}% complete
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) =>
                      handleDeleteCourse(e, course.id, course.title)
                    }
                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Delete course"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }
                )}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
