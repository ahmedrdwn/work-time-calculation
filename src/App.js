import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, Plus, Edit2, Trash2, Download, ArrowLeft } from 'lucide-react';

const McMasterTimeTracker = () => {
  // Load data from storage or use defaults
  const loadData = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects for timeEntries
        if (key === 'timeEntries') {
          return parsed.map(entry => ({
            ...entry,
            startDatetime: new Date(entry.startDatetime),
            endDatetime: entry.endDatetime ? new Date(entry.endDatetime) : null
          }));
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading data:', e);
    }
    return defaultValue;
  };

  const [projects, setProjects] = useState(() => loadData('projects', [
    { id: 'proj_001', name: 'Research Analysis', description: 'Literature review for psychology study', isActive: true },
    { id: 'proj_002', name: 'Lab Setup', description: 'Preparing equipment for spring experiments', isActive: true },
    { id: 'proj_003', name: 'Grant Writing', description: 'NSERC proposal development', isActive: true }
  ]));

  const [timeEntries, setTimeEntries] = useState(() => loadData('timeEntries', [
    { 
      id: 'entry_001', 
      projectId: 'proj_001', 
      startDatetime: new Date('2025-10-19T09:00:00'), 
      endDatetime: new Date('2025-10-19T11:30:00'), 
      notes: 'Reviewed 15 papers on cognitive load', 
      isRunning: false 
    },
    { 
      id: 'entry_002', 
      projectId: 'proj_002', 
      startDatetime: new Date('2025-10-19T13:00:00'), 
      endDatetime: new Date('2025-10-19T15:15:00'), 
      notes: 'Calibrated microscopes', 
      isRunning: false 
    },
    { 
      id: 'entry_003', 
      projectId: 'proj_001', 
      startDatetime: new Date('2025-10-20T10:00:00'), 
      endDatetime: new Date('2025-10-20T12:00:00'), 
      notes: 'Drafted introduction section', 
      isRunning: false 
    }
  ]));

  const [activeScreen, setActiveScreen] = useState('home');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateDuration = (start, end) => {
    const diff = (end - start) / 1000 / 60 / 60;
    return diff;
  };

  const formatDuration = (hours) => {
    const h = Math.floor(Math.abs(hours));
    const m = Math.round((Math.abs(hours) - h) * 60);
    return `${h}h ${m}m`;
  };

  const getRunningEntry = (projectId) => {
    return timeEntries.find(e => e.projectId === projectId && e.isRunning);
  };

  const startTimer = (projectId) => {
    const newEntry = {
      id: `entry_${Date.now()}`,
      projectId,
      startDatetime: new Date(),
      endDatetime: null,
      notes: '',
      isRunning: true
    };
    setTimeEntries([...timeEntries, newEntry]);
  };

  const stopTimer = (projectId) => {
    const runningEntry = getRunningEntry(projectId);
    if (runningEntry) {
      setTimeEntries(timeEntries.map(e => 
        e.id === runningEntry.id 
          ? { ...e, endDatetime: new Date(), isRunning: false }
          : e
      ));
    }
  };

  const addProject = (name, description) => {
    if (!name.trim()) return;
    const newProject = {
      id: `proj_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      isActive: true
    };
    setProjects([...projects, newProject]);
    setShowProjectForm(false);
    setEditingProject(null);
  };

  const updateProject = (id, name, description) => {
    if (!name.trim()) return;
    setProjects(projects.map(p => 
      p.id === id 
        ? { ...p, name: name.trim(), description: description.trim() }
        : p
    ));
    setShowProjectForm(false);
    setEditingProject(null);
    if (selectedProject && selectedProject.id === id) {
      setSelectedProject({ ...selectedProject, name: name.trim(), description: description.trim() });
    }
  };

  const deleteProject = (projectId) => {
    if (window.confirm('Delete this project? All time entries will remain.')) {
      setProjects(projects.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setActiveScreen('home');
      }
    }
  };

  const deleteEntry = (entryId) => {
    if (window.confirm('Delete this time entry?')) {
      setTimeEntries(timeEntries.filter(e => e.id !== entryId));
    }
  };

  const getTotalHours = (projectId = null) => {
    const entries = projectId 
      ? timeEntries.filter(e => e.projectId === projectId && !e.isRunning && e.endDatetime)
      : timeEntries.filter(e => !e.isRunning && e.endDatetime);
    
    return entries.reduce((sum, e) => {
      return sum + calculateDuration(e.startDatetime, e.endDatetime);
    }, 0);
  };

  const getElapsedTime = (entry) => {
    if (!entry.isRunning && entry.endDatetime) {
      return formatDuration(calculateDuration(entry.startDatetime, entry.endDatetime));
    }
    if (entry.isRunning) {
      return formatDuration(calculateDuration(entry.startDatetime, currentTime));
    }
    return '0h 0m';
  };

  const exportToExcel = () => {
    const headers = ['Project', 'Start Date', 'Start Time', 'End Date', 'End Time', 'Duration', 'Notes'];
    const rows = timeEntries
      .filter(e => !e.isRunning && e.endDatetime)
      .map(entry => {
        const project = projects.find(p => p.id === entry.projectId);
        return [
          project?.name || 'Unknown',
          entry.startDatetime.toLocaleDateString(),
          entry.startDatetime.toLocaleTimeString(),
          entry.endDatetime.toLocaleDateString(),
          entry.endDatetime.toLocaleTimeString(),
          formatDuration(calculateDuration(entry.startDatetime, entry.endDatetime)),
          entry.notes || ''
        ];
      });

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const entries = timeEntries
      .filter(e => !e.isRunning && e.endDatetime)
      .sort((a, b) => b.startDatetime - a.startDatetime);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Time Tracker Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #7A003C; margin-bottom: 10px; }
          .summary { 
            background-color: #f5f5f5; 
            padding: 20px; 
            margin: 20px 0; 
            border-radius: 8px;
            border-left: 4px solid #7A003C;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          th { 
            background-color: #7A003C; 
            color: white; 
            padding: 12px; 
            text-align: left;
            font-weight: 600;
          }
          td { 
            padding: 10px 12px; 
            border-bottom: 1px solid #e0e0e0;
          }
          tr:nth-child(even) { background-color: #fafafa; }
          tr:hover { background-color: #f0f0f0; }
          .project-name { color: #7A003C; font-weight: 600; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>McMaster Time Tracker Report</h1>
        <div class="summary">
          <p><strong>Total Hours Logged:</strong> ${formatDuration(getTotalHours())}</p>
          <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Entries:</strong> ${entries.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Date</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Duration</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(entry => {
              const project = projects.find(p => p.id === entry.projectId);
              return `
                <tr>
                  <td class="project-name">${project?.name || 'Unknown'}</td>
                  <td>${entry.startDatetime.toLocaleDateString()}</td>
                  <td>${entry.startDatetime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  <td>${entry.endDatetime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  <td><strong>${formatDuration(calculateDuration(entry.startDatetime, entry.endDatetime))}</strong></td>
                  <td>${entry.notes || '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const ProjectForm = () => {
    const [formName, setFormName] = useState(editingProject?.name || '');
    const [formDesc, setFormDesc] = useState(editingProject?.description || '');

    const handleSubmit = () => {
      if (editingProject) {
        updateProject(editingProject.id, formName, formDesc);
      } else {
        addProject(formName, formDesc);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4" style={{ color: '#7A003C' }}>
            {editingProject ? 'Edit Project' : 'New Project'}
          </h2>
          <input
            type="text"
            placeholder="Project Name *"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="w-full p-3 border-2 rounded mb-3 focus:outline-none focus:border-opacity-50"
            style={{ borderColor: '#7A003C' }}
          />
          <textarea
            placeholder="Description (optional)"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            className="w-full p-3 border-2 rounded mb-4 h-24 focus:outline-none focus:border-opacity-50"
            style={{ borderColor: '#7A003C' }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!formName.trim()}
              className="flex-1 py-2 px-4 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#4E4E4E', color: '#FFFFFF' }}
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowProjectForm(false);
                setEditingProject(null);
              }}
              className="flex-1 py-2 px-4 rounded font-semibold"
              style={{ backgroundColor: '#E0E0E0', color: '#4E4E4E' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const HomeScreen = () => (
    <div className="space-y-4">
      <div className="rounded-lg p-4" style={{ backgroundColor: '#E0E0E0', border: '2px solid #7A003C' }}>
        <div className="text-sm font-medium" style={{ color: '#7A003C' }}>Total Hours Logged</div>
        <div className="text-3xl font-bold" style={{ color: '#7A003C' }}>
          {formatDuration(getTotalHours())}
        </div>
      </div>

      <div className="space-y-3">
        {projects.filter(p => p.isActive).map(project => {
          const runningEntry = getRunningEntry(project.id);
          return (
            <div key={project.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 cursor-pointer" style={{ backgroundColor: '#7A003C' }}
                onClick={() => {
                  setSelectedProject(project);
                  setActiveScreen('detail');
                }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-white opacity-90 mt-1">{project.description}</p>
                    )}
                  </div>
                  <span className="text-white text-xl ml-2">→</span>
                </div>
              </div>
              <div className="p-4">
                {runningEntry ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#7A003C' }}>
                      <Clock className="w-5 h-5" />
                      <span className="font-mono font-bold text-xl">{getElapsedTime(runningEntry)}</span>
                      <span className="px-2 py-1 rounded text-xs font-semibold ml-auto" style={{ backgroundColor: '#E0E0E0', color: '#7A003C' }}>
                        Running
                      </span>
                    </div>
                    <button
                      onClick={() => stopTimer(project.id)}
                      className="w-full py-2 px-4 rounded font-semibold flex items-center justify-center gap-2 hover:opacity-90"
                      style={{ backgroundColor: '#7A003C', color: '#FFFFFF' }}
                    >
                      <Square className="w-4 h-4" />
                      Stop Timer
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => startTimer(project.id)}
                      className="w-full py-2 px-4 rounded font-semibold flex items-center justify-center gap-2 hover:opacity-90"
                      style={{ backgroundColor: '#4E4E4E', color: '#FFFFFF' }}
                    >
                      <Play className="w-4 h-4" />
                      Start Timer
                    </button>
                    <div className="mt-2 text-sm text-center" style={{ color: '#4E4E4E' }}>
                      Total: {formatDuration(getTotalHours(project.id))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const ProjectDetailScreen = () => {
    if (!selectedProject) return null;
    
    const projectEntries = timeEntries.filter(e => e.projectId === selectedProject.id);
    const runningEntry = getRunningEntry(selectedProject.id);

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h2 className="text-2xl font-bold" style={{ color: '#7A003C' }}>{selectedProject.name}</h2>
              {selectedProject.description && (
                <p className="text-sm mt-1" style={{ color: '#4E4E4E' }}>{selectedProject.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingProject(selectedProject);
                  setShowProjectForm(true);
                }}
                className="p-2 hover:bg-gray-100 rounded"
                style={{ color: '#7A003C' }}
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => deleteProject(selectedProject.id)}
                className="p-2 hover:bg-gray-100 rounded"
                style={{ color: '#7A003C' }}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="text-sm font-semibold" style={{ color: '#4E4E4E' }}>
            Total Hours: <span className="text-lg" style={{ color: '#7A003C' }}>{formatDuration(getTotalHours(selectedProject.id))}</span>
          </div>
        </div>

        {runningEntry ? (
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-3 mb-3" style={{ color: '#7A003C' }}>
              <Clock className="w-6 h-6" />
              <span className="text-3xl font-mono font-bold">{getElapsedTime(runningEntry)}</span>
            </div>
            <button
              onClick={() => stopTimer(selectedProject.id)}
              className="w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90"
              style={{ backgroundColor: '#7A003C', color: '#FFFFFF' }}
            >
              <Square className="w-5 h-5" />
              Stop Timer
            </button>
          </div>
        ) : (
          <button
            onClick={() => startTimer(selectedProject.id)}
            className="w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md hover:opacity-90"
            style={{ backgroundColor: '#4E4E4E', color: '#FFFFFF' }}
          >
            <Play className="w-5 h-5" />
            Start Timer
          </button>
        )}

        <div>
          <h3 className="font-bold mb-3 text-lg" style={{ color: '#7A003C' }}>Time Entries</h3>
          <div className="space-y-2">
            {projectEntries.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg" style={{ color: '#4E4E4E' }}>
                No time entries yet. Start tracking time!
              </div>
            ) : (
              projectEntries.sort((a, b) => b.startDatetime - a.startDatetime).map(entry => (
                <div key={entry.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-mono font-bold text-xl mb-1" style={{ color: '#7A003C' }}>
                        {getElapsedTime(entry)}
                      </div>
                      <div className="text-sm" style={{ color: '#4E4E4E' }}>
                        {entry.startDatetime.toLocaleDateString()} • {entry.startDatetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {entry.endDatetime && ` - ${entry.endDatetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        {entry.isRunning && ' - Running'}
                      </div>
                      {entry.notes && (
                        <div className="text-sm mt-2 italic" style={{ color: '#4E4E4E' }}>{entry.notes}</div>
                      )}
                    </div>
                    {!entry.isRunning && (
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="p-2 hover:bg-gray-100 rounded"
                        style={{ color: '#7A003C' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const TimeLogScreen = () => {
    const allEntries = timeEntries
      .filter(e => !e.isRunning && e.endDatetime)
      .sort((a, b) => b.startDatetime - a.startDatetime);

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm font-medium" style={{ color: '#4E4E4E' }}>Total Hours Logged</div>
          <div className="text-3xl font-bold" style={{ color: '#7A003C' }}>
            {formatDuration(getTotalHours())}
          </div>
          <div className="text-sm mt-1" style={{ color: '#4E4E4E' }}>
            {allEntries.length} completed {allEntries.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90"
            style={{ backgroundColor: '#4E4E4E', color: '#FFFFFF' }}
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90"
            style={{ backgroundColor: '#7A003C', color: '#FFFFFF' }}
          >
            <Download className="w-5 h-5" />
            Export PDF
          </button>
        </div>

        <div className="space-y-2">
          {allEntries.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg" style={{ color: '#4E4E4E' }}>
              No completed time entries yet
            </div>
          ) : (
            allEntries.map(entry => {
              const project = projects.find(p => p.id === entry.projectId);
              return (
                <div key={entry.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7A003C' }}></div>
                        <span className="font-semibold text-lg" style={{ color: '#7A003C' }}>
                          {project?.name || 'Unknown Project'}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-xl mb-1" style={{ color: '#7A003C' }}>
                        {getElapsedTime(entry)}
                      </div>
                      <div className="text-sm" style={{ color: '#4E4E4E' }}>
                        {entry.startDatetime.toLocaleDateString()} • 
                        {' '}{entry.startDatetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                        {' '}{entry.endDatetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {entry.notes && (
                        <div className="text-sm mt-2 italic" style={{ color: '#4E4E4E' }}>{entry.notes}</div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-2 hover:bg-gray-100 rounded"
                      style={{ color: '#7A003C' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5' }}>
      <div className="max-w-2xl mx-auto pb-24">
        <header className="p-4 shadow-md sticky top-0 z-10" style={{ backgroundColor: '#7A003C' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(activeScreen === 'detail' || activeScreen === 'log') && (
                <button
                  onClick={() => {
                    setActiveScreen('home');
                    setSelectedProject(null);
                  }}
                  className="text-white hover:opacity-80"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              )}
              <Clock className="w-6 h-6 text-white" />
              <h1 className="text-xl font-bold text-white">
                {activeScreen === 'detail' ? selectedProject?.name : 'Time Tracker'}
              </h1>
            </div>
            {activeScreen === 'home' && (
              <button
                onClick={() => setShowProjectForm(true)}
                className="p-2 rounded-full hover:opacity-80"
                style={{ backgroundColor: '#4E4E4E' }}
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </header>

        <main className="p-4">
          {activeScreen === 'home' && <HomeScreen />}
          {activeScreen === 'detail' && <ProjectDetailScreen />}
          {activeScreen === 'log' && <TimeLogScreen />}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-10">
          <div className="max-w-2xl mx-auto flex">
            <button
              onClick={() => {
                setActiveScreen('home');
                setSelectedProject(null);
              }}
              className="flex-1 py-4 text-center font-semibold transition-colors"
              style={{ 
                color: activeScreen === 'home' ? '#7A003C' : '#4E4E4E',
                borderTop: activeScreen === 'home' ? '3px solid #7A003C' : 'none'
              }}
            >
              Projects
            </button>
            <button
              onClick={() => setActiveScreen('log')}
              className="flex-1 py-4 text-center font-semibold transition-colors"
              style={{ 
                color: activeScreen === 'log' ? '#7A003C' : '#4E4E4E',
                borderTop: activeScreen === 'log' ? '3px solid #7A003C' : 'none'
              }}
            >
              Time Log
            </button>
          </div>
        </nav>

        {showProjectForm && <ProjectForm />}
      </div>
    </div>
  );
};

export default McMasterTimeTracker;