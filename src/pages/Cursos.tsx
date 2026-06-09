import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Video, ExternalLink, Plus, CheckCircle, RefreshCw, X, PlayCircle } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  materialsUrl: string;
  createdByName: string;
  createdAt: string;
}

export const Cursos: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // Create Course states
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [materialsUrl, setMaterialsUrl] = useState('');
  
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchCourses = async () => {
    try {
      setFetching(true);
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
        if (data.length > 0 && !selectedCourse) {
          setSelectedCourse(data[0]); // Select first course by default
        }
      }
    } catch (err) {
      console.error('Erro ao buscar cursos:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, videoUrl, materialsUrl })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao registrar curso.');
      }

      setSuccess('Curso publicado com sucesso!');
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setMaterialsUrl('');
      setShowModal(false);
      await fetchCourses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to resolve YouTube embed URL
  const getEmbedVideoUrl = (url: string) => {
    if (!url) return '';
    
    // YouTube short link (youtu.be/ID)
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    
    return url; // Return raw URL if not youtube
  };

  const isYouTube = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const isOfficer = hasPermission('users'); // Major+ can create courses

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-yellow-400" />
          <div>
            <h2 className="font-outfit font-bold text-slate-100 text-lg">Academia de Polícia & Treinamentos</h2>
            <p className="text-xs text-slate-500">Módulo de formação tática. Vídeo-aulas, manuais práticos e materiais de estudo.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isOfficer && (
            <button
              onClick={() => { setShowModal(true); setError(''); setSuccess(''); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold transition-all shadow-md uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Treinamento</span>
            </button>
          )}
          <button 
            onClick={fetchCourses} 
            disabled={fetching}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
            title="Recarregar"
          >
            <RefreshCw className={`w-4.5 h-4.5 ${fetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {fetching && courses.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin" />
          <span>Carregando centro de estudos...</span>
        </div>
      ) : courses.length === 0 ? (
        <div className="py-24 text-center text-slate-500 text-sm glass-panel rounded-2xl border border-slate-800/60">
          Nenhum curso ou treinamento publicado na central.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel: Course Player (7 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {selectedCourse ? (
              <div className="glass-panel rounded-2xl p-5 border border-slate-800/60 flex flex-col gap-4 shadow-xl">
                
                {/* Video Container */}
                {selectedCourse.videoUrl ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-850 bg-black relative">
                    {isYouTube(selectedCourse.videoUrl) ? (
                      <iframe
                        src={getEmbedVideoUrl(selectedCourse.videoUrl)}
                        title={selectedCourse.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video 
                        src={selectedCourse.videoUrl} 
                        controls 
                        className="w-full h-full"
                      />
                    )}
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-xl bg-slate-900/40 border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                    <Video className="w-10 h-10 text-slate-600" />
                    <span>Nenhum vídeo anexado a esta instrução.</span>
                  </div>
                )}

                {/* Info & Materials */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-start gap-4 border-b border-slate-800/60 pb-3">
                    <div>
                      <h3 className="font-outfit font-extrabold text-lg text-slate-200">{selectedCourse.title}</h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Postado por: {selectedCourse.createdByName} | {new Date(selectedCourse.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    
                    {selectedCourse.materialsUrl && (
                      <a
                        href={selectedCourse.materialsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-yellow-600/10 hover:bg-yellow-600/25 border border-yellow-500/25 text-yellow-400 hover:text-yellow-300 text-xs font-bold transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>VER MATERIAIS</span>
                      </a>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">
                    {selectedCourse.description}
                  </p>
                </div>

              </div>
            ) : (
              <div className="py-20 text-center text-slate-500 text-sm italic">
                Selecione uma aula no menu lateral para iniciar.
              </div>
            )}
          </div>

          {/* Right Panel: Lectures Catalogue (4 cols) */}
          <div className="lg:col-span-4 glass-panel rounded-2xl p-5 border border-slate-800/60 h-fit space-y-4">
            <h3 className="font-outfit font-bold text-slate-200 text-sm border-b border-slate-800 pb-3">Grade Curricular / Aulas</h3>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {courses.map((course) => {
                const isSelected = selectedCourse?.id === course.id;

                return (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className={`w-full p-3.5 text-left rounded-xl border transition-all flex items-start gap-3 group ${
                      isSelected 
                        ? 'bg-yellow-600/15 text-yellow-400 border-yellow-500/35 shadow-sm' 
                        : 'bg-slate-900/30 text-slate-400 border-slate-800 hover:border-slate-700/50 hover:bg-slate-900/50'
                    }`}
                  >
                    <PlayCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      isSelected ? 'text-yellow-400' : 'text-slate-600 group-hover:text-slate-400 transition-colors'
                    }`} />
                    <div className="overflow-hidden">
                      <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                        {course.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-yellow-400" />
                <h3 className="font-outfit font-bold text-slate-200">Publicar Novo Treinamento</h3>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Título do Treinamento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Treinamento de Abordagem M-20"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Ementa / Descrição detalhada</label>
                <textarea
                  required
                  placeholder="Escreva sobre o objetivo do curso e instruções..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Link do Vídeo (Youtube ou Mp4)</label>
                <input
                  type="url"
                  placeholder="Ex: https://www.youtube.com/watch?v=VIDEO_ID"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Link dos Materiais (Drive/Docs)</label>
                <input
                  type="url"
                  placeholder="Ex: https://drive.google.com/..."
                  value={materialsUrl}
                  onChange={(e) => setMaterialsUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 font-bold text-xs text-white uppercase tracking-wider transition-colors shadow-md hover:shadow-yellow-500/10"
                >
                  {submitting ? 'Publicando...' : 'PUBLICAR CURSO'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-colors border border-slate-700/60"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Cursos;
