import React, { useState, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { parseTemplate, TemplateData } from './utils/parser';
import { exportToExcel, exportToCSV, exportToJSON, exportMultiSheetExcel } from './utils/export';
import { 
  BarChart3, 
  Search, 
  Mail, 
  GitBranch, 
  FileText, 
  Download, 
  FileCode2, 
  Trash2,
  AlertCircle
} from 'lucide-react';

type Tab = 'dashboard' | 'search' | 'subjects' | 'conditions' | 'content';

export default function App() {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [contentSearchQuery, setContentSearchQuery] = useState('');

  const handleFilesSelected = async (files: File[]) => {
    const newFiles = files.filter(file => !templates.some(t => t.name === file.name));
    if (newFiles.length < files.length) {
      alert(`${files.length - newFiles.length} duplicate file(s) were skipped.`);
    }
    if (newFiles.length === 0) return;
    
    const parsedTemplates = await Promise.all(newFiles.map(file => parseTemplate(file)));
    setTemplates(prev => [...prev, ...parsedTemplates]);
  };

  const clearAllTemplates = () => {
    setTemplates([]);
  };

  const removeTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // --- Analytics ---
  const totalTemplates = templates.length;
  const allVariables = templates.flatMap(t => t.variables);
  const uniqueVariables = new Set(allVariables).size;
  const allSubjects = templates.flatMap(t => t.subjects);
  const totalSubjects = allSubjects.length;
  
  const variableCounts = allVariables.reduce((acc, v) => {
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostUsedVariable = Object.entries(variableCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0]?.[0] || 'N/A';

  // --- Search Logic ---
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const results: any[] = [];
    templates.forEach(t => {
      if (t.rawContent.toLowerCase().includes(searchQuery.toLowerCase())) {
        const locations = [];
        if (t.conditions.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))) locations.push("condition rule");
        if (t.subjects.some(s => s.text.toLowerCase().includes(searchQuery.toLowerCase()))) locations.push("subject line");
        if (t.textBlocks.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()))) locations.push("text node");
        if (locations.length === 0) locations.push("raw content");
        
        results.push({
          variable: searchQuery,
          template: t.name,
          location: locations.join(", ")
        });
      }
    });
    return results;
  }, [searchQuery, templates]);

  // --- Content Search Logic ---
  const contentSearchResults = useMemo(() => {
    if (!contentSearchQuery) return [];
    const results: any[] = [];
    templates.forEach(t => {
      t.textBlocks.forEach(block => {
        if (block.toLowerCase().includes(contentSearchQuery.toLowerCase())) {
          results.push({
            template: t.name,
            content: block
          });
        }
      });
    });
    return results;
  }, [contentSearchQuery, templates]);

  // --- Duplicate Subjects ---
  const duplicateSubjects = useMemo(() => {
    const subjectMap: Record<string, string[]> = {};
    templates.forEach(t => {
      t.subjects.forEach(s => {
        if (!subjectMap[s.text]) subjectMap[s.text] = [];
        if (!subjectMap[s.text].includes(t.name)) {
          subjectMap[s.text].push(t.name);
        }
      });
    });
    return Object.entries(subjectMap)
      .filter(([_, templates]) => templates.length > 1)
      .map(([subject, templates]) => ({ subject, templates }));
  }, [templates]);

  // --- Exports ---
  const handleExportAll = () => {
    const variablesData = templates.flatMap(t => t.variables.map(v => ({ Template: t.name, Variable: v })));
    const subjectsData = templates.flatMap(t => t.subjects.map(s => ({ Template: t.name, Channel: s.channel, Subject: s.text })));
    const conditionsData = templates.flatMap(t => t.conditions.map(c => ({ Template: t.name, Condition: c })));

    exportMultiSheetExcel([
      { name: 'Variables', data: variablesData },
      { name: 'Subject Lines', data: subjectsData },
      { name: 'Conditions', data: conditionsData }
    ], 'Template_Intelligence_Report');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col shadow-sm z-10">
        <div className="p-8 border-b border-slate-100 bg-gradient-to-br from-emerald-600 to-indigo-700">
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <FileCode2 className="h-6 w-6 text-white" />
            </div>
            Inspire
          </h1>
          <p className="text-emerald-100 text-xs font-medium mt-2 uppercase tracking-widest opacity-80">Intelligence Hub</p>
        </div>
        
        <nav className="p-6 space-y-2 flex-1">
          <NavItem icon={<BarChart3 size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Search size={20} />} label="Variable Search" active={activeTab === 'search'} onClick={() => setActiveTab('search')} />
          <NavItem icon={<Mail size={20} />} label="Subject Lines" active={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')} />
          <NavItem icon={<GitBranch size={20} />} label="Conditions" active={activeTab === 'conditions'} onClick={() => setActiveTab('conditions')} />
          <NavItem icon={<FileText size={20} />} label="Content Extractor" active={activeTab === 'content'} onClick={() => setActiveTab('content')} />
        </nav>

        <div className="p-6 space-y-3 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={handleExportAll}
            disabled={templates.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed active:scale-95"
          >
            <Download size={18} />
            Export Report
          </button>
          
          {templates.length > 0 && (
            <button 
              onClick={clearAllTemplates}
              className="w-full flex items-center justify-center gap-2 text-slate-400 py-2 px-4 rounded-xl text-sm font-medium hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <Trash2 size={16} />
              Clear All Data
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 md:p-12">
        {activeTab === 'dashboard' && (
          <div className="space-y-10 max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Intelligence Dashboard</h2>
                <p className="text-slate-500 mt-2 text-lg">Analyze and extract logic from your Inspire templates.</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                System Ready
              </div>
            </header>

            {/* Upload Section */}
            <section className="bg-white p-2 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <FileUpload onFilesSelected={handleFilesSelected} />
            </section>

            {/* Analytics Cards */}
            {templates.length > 0 && (
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Templates" value={totalTemplates} icon={<FileCode2 className="text-emerald-600" />} color="emerald" />
                <StatCard title="Variables" value={uniqueVariables} icon={<Search className="text-indigo-600" />} color="indigo" />
                <StatCard title="Subjects" value={totalSubjects} icon={<Mail className="text-amber-600" />} color="amber" />
                <StatCard title="Top Variable" value={mostUsedVariable} icon={<BarChart3 className="text-rose-600" />} color="rose" />
              </section>
            )}

            {/* Uploaded Templates List */}
            {templates.length > 0 && (
              <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                  <h3 className="font-bold text-slate-800 text-lg">Inventory ({templates.length})</h3>
                </div>
                <ul className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                  {templates.map(t => (
                    <li key={t.id} className="px-8 py-4 flex justify-between items-center hover:bg-indigo-50/30 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white transition-colors">
                          <FileText className="text-slate-400 h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 block">{t.name}</span>
                          <span className="text-xs text-slate-400 font-medium uppercase tracking-tighter">
                            {t.variables.length} vars • {t.conditions.length} rules
                          </span>
                        </div>
                      </div>
                      <button onClick={() => removeTemplate(t.id)} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            <header>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Variable Search</h2>
              <p className="text-slate-500 mt-2 text-lg">Trace variable impact across your entire template library.</p>
            </header>

            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="relative max-w-xl mb-10">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-6 w-6" />
                <input 
                  type="text" 
                  placeholder="Search variable name (e.g. cust_id)..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-lg font-medium"
                />
              </div>

              {searchQuery && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 text-xl">Matches Found ({searchResults.length})</h3>
                    <button 
                      onClick={() => exportToExcel(searchResults, `Search_${searchQuery}`)}
                      className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors flex items-center gap-2"
                    >
                      <Download size={16} /> Export Results
                    </button>
                  </div>
                  
                  {searchResults.length > 0 ? (
                    <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest">Variable</th>
                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest">Template</th>
                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest">Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {searchResults.map((r, i) => (
                            <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-mono text-indigo-600 font-bold">{r.variable}</td>
                              <td className="px-6 py-4 font-medium text-slate-700">{r.template}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 shadow-sm">
                                  {r.location}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <Search className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                      <p className="text-slate-400 font-medium">No instances found for "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Subject Lines</h2>
                <p className="text-slate-500 mt-2 text-lg">Omnichannel subject metadata extraction.</p>
              </div>
              <button 
                onClick={() => exportToExcel(templates.flatMap(t => t.subjects.map(s => ({ Template: t.name, Channel: s.channel, Subject: s.text }))), 'Subject_Lines')}
                className="flex items-center gap-2 bg-indigo-600 text-white py-3 px-6 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                <Download size={18} /> Export List
              </button>
            </header>

            {duplicateSubjects.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 shadow-sm animate-in zoom-in duration-300">
                <h3 className="text-rose-700 font-black flex items-center gap-3 mb-4 text-lg">
                  <div className="bg-rose-500 p-1.5 rounded-lg text-white">
                    <AlertCircle size={20} />
                  </div>
                  Critical: Duplicate Subjects Detected
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {duplicateSubjects.map((ds, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
                      <p className="text-slate-800 font-bold mb-2 italic">"{ds.subject}"</p>
                      <div className="flex flex-wrap gap-2">
                        {ds.templates.map((t, ti) => (
                          <span key={ti} className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5 font-bold text-xs uppercase tracking-widest">Template</th>
                      <th className="px-8 py-5 font-bold text-xs uppercase tracking-widest">Channel</th>
                      <th className="px-8 py-5 font-bold text-xs uppercase tracking-widest">Subject Line</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {templates.flatMap(t => t.subjects.map((s, i) => (
                      <tr key={`${t.id}-${i}`} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-8 py-5 font-bold text-slate-700">{t.name}</td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            s.channel === 'Email' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 
                            s.channel === 'Inbox' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 
                            'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}>
                            {s.channel}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-slate-600 font-medium leading-relaxed">{s.text}</td>
                      </tr>
                    )))}
                    {templates.length === 0 && (
                      <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-medium">No template data available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'conditions' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Conditional Logic</h2>
                <p className="text-slate-500 mt-2 text-lg">Deep-scan of IF/ELSE statements and logic rules.</p>
              </div>
              <button 
                onClick={() => exportToExcel(templates.flatMap(t => t.conditions.map(c => ({ Template: t.name, Condition: c }))), 'Conditions')}
                className="flex items-center gap-2 bg-indigo-600 text-white py-3 px-6 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                <Download size={18} /> Export Logic
              </button>
            </header>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5 font-bold text-xs uppercase tracking-widest w-1/3">Template</th>
                      <th className="px-8 py-5 font-bold text-xs uppercase tracking-widest">Logic Rule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {templates.flatMap(t => t.conditions.map((c, i) => (
                      <tr key={`${t.id}-${i}`} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-8 py-6 font-bold text-slate-700 align-top">{t.name}</td>
                        <td className="px-8 py-6">
                          <div className="font-mono text-xs text-indigo-700 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 shadow-inner leading-relaxed break-all">
                            {c}
                          </div>
                        </td>
                      </tr>
                    )))}
                    {templates.length === 0 && (
                      <tr><td colSpan={2} className="px-8 py-20 text-center text-slate-400 font-medium">No logic rules detected.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            <header>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Content Extractor</h2>
              <p className="text-slate-500 mt-2 text-lg">Search and extract text blocks across your template library.</p>
            </header>

            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="relative max-w-xl mb-10">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-6 w-6" />
                <input 
                  type="text" 
                  placeholder="Search content (e.g. policy, discount)..." 
                  value={contentSearchQuery}
                  onChange={(e) => setContentSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-lg font-medium"
                />
              </div>

              {contentSearchQuery && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 text-xl">Content Matches ({contentSearchResults.length})</h3>
                    <button 
                      onClick={() => exportToExcel(contentSearchResults, `Content_${contentSearchQuery}`)}
                      className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors flex items-center gap-2"
                    >
                      <Download size={16} /> Export Matches
                    </button>
                  </div>
                  
                  {contentSearchResults.length > 0 ? (
                    <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest w-1/4">Template</th>
                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest">Content Block</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {contentSearchResults.map((r, i) => (
                            <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-700">{r.template}</td>
                              <td className="px-6 py-4 text-slate-600 font-medium leading-relaxed">{r.content}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <Search className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                      <p className="text-slate-400 font-medium">No content found matching "{contentSearchQuery}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Helper Components ---

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-indigo-50 text-indigo-700' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: 'emerald' | 'indigo' | 'amber' | 'rose' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100'
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-5 transition-transform hover:scale-[1.02]">
      <div className={`p-4 rounded-2xl border ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
      </div>
    </div>
  );
}
