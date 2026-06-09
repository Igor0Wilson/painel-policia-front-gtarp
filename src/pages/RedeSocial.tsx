import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PlaySquare, Heart, MessageCircle, Send, Share2, Plus, Film, AlertTriangle, Link2, X, CheckCircle } from 'lucide-react';
import { RankIcon } from '../components/RankIcon';


interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatarUrl?: string;
  authorCoverUrl?: string;
  createdAt: string;
}

interface Post {
  id: string;
  videoUrl: string;
  description: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatarUrl?: string;
  authorCoverUrl?: string;
  likes: string[];
  comments: Comment[];
  createdAt: string;
}

import { createPortal } from 'react-dom';

const getLocalRankLabel = (role: string) => {
  const roles: Record<string, string> = {
    'coronel': 'Coronel',
    'tenente-coronel': 'Ten. Coronel',
    'major': 'Major',
    'capitao': 'Capitão',
    '1-tenente': '1º Tenente',
    '2-tenente': '2º Tenente',
    'aspirante': 'Aspirante',
    'subtenente': 'Subtenente',
    '1-sargento': '1º Sargento',
    '2-sargento': '2º Sargento',
    '3-sargento': '3º Sargento',
    'cabo': 'Cabo',
    'soldado': 'Soldado',
    'aluno': 'Aluno Soldado'
  };
  return roles[role] || role || 'Militar';
};

export const UserHoverCard: React.FC<{
  authorName: string;
  authorRole: string;
  avatarUrl?: string;
  coverUrl?: string;
  tags?: string[];
  children: React.ReactNode;
}> = ({ authorName, authorRole, avatarUrl, coverUrl, tags = [], children }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top, // position above the element
        left: rect.left + rect.width / 2
      });
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 100); // slight delay to allow moving mouse into the popover if needed (though it's pointer-events-none right now)
  };

  return (
    <div 
      className="relative flex items-center justify-center cursor-help"
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isHovered && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none transition-opacity duration-200"
          style={{ 
            top: coords.top - 8, // 8px spacing
            left: coords.left,
            transform: 'translate(-50%, -100%)' // center horizontally, above the element
          }}
        >
          {/* Card Content */}
          <div className="w-56 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="h-16 bg-zinc-900 border-b border-zinc-800">
              {coverUrl ? (
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-zinc-900 to-zinc-800" />
              )}
            </div>
            <div className="px-4 pb-4 pt-0 relative flex flex-col items-center">
              <div className="w-14 h-14 rounded-xl bg-zinc-800 border-[3px] border-zinc-950 -mt-7 flex items-center justify-center overflow-hidden shadow-lg z-10 bg-zinc-950">
                 {avatarUrl ? (
                   <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                   <RankIcon role={authorRole} className="w-7 h-7 text-zinc-500" />
                 )}
              </div>
              <div className="text-center mt-2 w-full">
                <h4 className="font-bold text-zinc-100 text-sm truncate w-full">{authorName}</h4>
                <span className="text-[9px] text-yellow-500 uppercase font-black tracking-widest block mt-0.5">{getLocalRankLabel(authorRole)}</span>
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                    {tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 text-[8px] rounded border bg-indigo-900/30 text-indigo-400 border-indigo-700/50 uppercase font-bold tracking-widest truncate max-w-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const RedeSocial: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create Post
  const [isCreating, setIsCreating] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subdivisaoMap, setSubdivisaoMap] = useState<Record<string, string[]>>({});

  // Comment State
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    fetchPosts();
    fetchSubdivisoes();
  }, []);

  const fetchSubdivisoes = async () => {
    try {
      const res = await fetch('/api/subdivisoes');
      if (res.ok) {
        const subdivisoes = await res.json();
        const map: Record<string, string[]> = {};
        subdivisoes.forEach((sub: any) => {
          sub.operators.forEach((op: any) => {
            if (!map[op.userId]) map[op.userId] = [];
            map[op.userId].push(sub.name);
          });
          if (sub.comandoId) {
            if (!map[sub.comandoId]) map[sub.comandoId] = [];
            if (!map[sub.comandoId].includes(sub.name)) map[sub.comandoId].push(sub.name);
          }
        });
        setSubdivisaoMap(map);
      }
    } catch (err) {}
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error('Falha ao carregar o feed.');
      const data = await res.json();
      setPosts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoUrl) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: newVideoUrl, description: newDescription })
      });
      if (!res.ok) throw new Error('Erro ao publicar vídeo');

      setNewVideoUrl('');
      setNewDescription('');
      setIsCreating(false);
      fetchPosts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      // Optimistic Update
      setPosts(currentPosts => currentPosts.map(p => {
        if (p.id === postId) {
          const hasLiked = user?.id && p.likes.includes(user.id);
          const newLikes = hasLiked
            ? p.likes.filter(id => id !== user?.id)
            : [...p.likes, user?.id || ''];
          return { ...p, likes: newLikes };
        }
        return p;
      }));

      await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    } catch (error) {
    }
  };

  const handleComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText })
      });
      if (res.ok) {
        setCommentText('');
        fetchPosts();
      }
    } catch (err) {
    }
  };

  // Funcao nativa para converter links do YT em embed e renderizar videos mp4
  const renderVideo = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        return (
          <iframe
            className="w-full aspect-video rounded-xl border border-zinc-800"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }
    // Se for Medal.tv ou outros, ou MP4 direto, tenta colocar na tag video.
    // Se o embed quebrar, renderiza um iframe basico.
    if (url.includes('medal.tv')) {
      // Tenta adaptar o link do medal
      return (
        <iframe
          className="w-full aspect-video rounded-xl border border-zinc-800"
          src={url.replace('/clips/', '/clip/')}
          allowFullScreen
        />
      );
    }

    // Default MP4 or link
    return (
      <video controls className="w-full max-h-[500px] object-cover rounded-xl border border-zinc-800 bg-black">
        <source src={url} />
        Seu navegador não suporta a tag de vídeo. <a href={url} target="_blank" rel="noreferrer" className="text-yellow-500 underline">Clique aqui para ver o vídeo.</a>
      </video>
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 relative">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 text-zinc-200 px-6 py-3 rounded-full font-bold shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-3 animate-in slide-in-from-top-5 fade-in z-50">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-outfit font-black text-zinc-100 flex items-center gap-3">
            <PlaySquare className="text-yellow-500 w-8 h-8" /> Comunidade
          </h1>
          <p className="text-sm text-zinc-400 mt-1 font-medium">Compartilhe vídeos, operações e interaja com a corporação.</p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-6 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-yellow-600/20"
        >
          {isCreating ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {isCreating ? 'CANCELAR' : 'NOVA POSTAGEM'}
        </button>
      </div>

      {/* Form Criar Postagem */}
      {isCreating && (
        <div className="glass-panel border border-yellow-500/30 rounded-3xl p-6 bg-zinc-900/80 shadow-[0_0_30px_rgba(59,130,246,0.1)] relative overflow-hidden animate-in slide-in-from-top-4">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-yellow-500 to-yellow-500" />
          <h3 className="font-outfit font-bold text-lg text-zinc-100 mb-4 flex items-center gap-2">
            <Film className="w-5 h-5 text-yellow-400" /> Publicar Novo Vídeo
          </h3>

          <form onSubmit={handleCreatePost} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" /> Link do Vídeo (YouTube, MP4, Medal)
              </label>
              <input
                type="url"
                required
                placeholder="https://..."
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                className="w-full glass-input"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                Descrição ou Contexto (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Escreva algo sobre este vídeo..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full glass-input"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 mt-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-bold transition-all shadow-lg shadow-yellow-900/30"
            >
              {submitting ? 'PUBLICANDO...' : 'PUBLICAR NO FEED'}
            </button>
          </form>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin" />
          <span className="text-xs font-bold tracking-widest uppercase">Carregando feed...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center border border-zinc-800 border-dashed rounded-3xl bg-zinc-900/20 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center">
            <Film className="w-8 h-8 text-zinc-500" />
          </div>
          <div>
            <p className="text-zinc-300 font-bold text-lg">Nenhuma postagem ainda</p>
            <p className="text-zinc-500 text-sm mt-1">Seja o primeiro a compartilhar uma operação!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {posts.map(post => {
            const hasLiked = user?.id && post.likes.includes(user.id);
            const isCommentsOpen = activeCommentPost === post.id;

            return (
              <div key={post.id} className="glass-panel border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-950/60 shadow-lg">
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900/40">
                  <div className="flex-1">
                    <UserHoverCard 
                      authorName={post.authorName} 
                      authorRole={post.authorRole} 
                      avatarUrl={post.authorAvatarUrl} 
                      coverUrl={post.authorCoverUrl}
                      tags={subdivisaoMap[post.authorId] || []}
                    >
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-inner overflow-hidden flex-shrink-0">
                        {post.authorAvatarUrl ? (
                          <img src={post.authorAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <RankIcon role={post.authorRole} className="w-6 h-6 text-zinc-400" />
                        )}
                      </div>
                    </UserHoverCard>
                  </div>
                  <div>
                      <h4 className="font-bold text-zinc-200 text-sm">{post.authorName}</h4>
                      <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest">
                        <span className="text-yellow-400">{getLocalRankLabel(post.authorRole)}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-500">
                          {new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {new Date(post.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                </div>

                {/* Post Content (Video + Text) */}
                <div className="p-0">
                  {renderVideo(post.videoUrl)}
                </div>

                {post.description && (
                  <div className="p-4 bg-zinc-950">
                    <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                      <span className="font-bold text-zinc-100 mr-2">{post.authorName}</span>
                      {post.description}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="px-4 py-3 border-t border-zinc-800/50 bg-zinc-900/40 flex items-center gap-6">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 text-sm font-bold transition-colors ${hasLiked ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    <Heart className={`w-6 h-6 ${hasLiked ? 'fill-rose-500' : ''}`} />
                    {post.likes.length}
                  </button>

                  <button
                    onClick={() => setActiveCommentPost(isCommentsOpen ? null : post.id)}
                    className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <MessageCircle className="w-6 h-6" />
                    {post.comments.length}
                  </button>

                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/clipe/${post.id}`;
                      navigator.clipboard.writeText(link);
                      showToast("Link do clipe copiado com sucesso!");
                    }}
                    className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-yellow-400 transition-colors ml-auto"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Comments Section */}
                {isCommentsOpen && (
                  <div className="bg-zinc-950 border-t border-zinc-800/50 animate-in slide-in-from-top-2">
                    {/* List */}
                    <div className="max-h-60 overflow-y-auto p-4 space-y-4">
                      {post.comments.length === 0 ? (
                        <p className="text-xs text-center text-zinc-600 font-bold uppercase tracking-widest py-4">Nenhum comentário ainda</p>
                      ) : (
                        post.comments.map(c => (
                          <div key={c.id} className="flex gap-3">
                            <UserHoverCard 
                              authorName={c.authorName} 
                              authorRole={c.authorRole} 
                              avatarUrl={c.authorAvatarUrl} 
                              coverUrl={c.authorCoverUrl}
                              tags={subdivisaoMap[c.authorId] || []}
                            >
                              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                                {c.authorAvatarUrl ? (
                                  <img src={c.authorAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <RankIcon role={c.authorRole} className="w-5 h-5 text-zinc-500" />
                                )}
                              </div>
                            </UserHoverCard>
                            <div className="bg-zinc-900/50 p-3 rounded-2xl rounded-tl-none border border-zinc-800/80 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-zinc-200 text-xs">{c.authorName}</span>
                                <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1 bg-zinc-900/80 px-2 py-0.5 rounded-md border border-zinc-800">
                                  <RankIcon role={c.authorRole} className="w-3 h-3 text-yellow-500" />
                                  {getLocalRankLabel(c.authorRole)}
                                </span>
                                <span className="text-[9px] text-zinc-600 ml-auto font-medium">
                                  {new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {new Date(c.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-300">{c.text}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment */}
                    <div className="p-4 border-t border-zinc-900 bg-zinc-900/20">
                      <form onSubmit={(e) => handleComment(e, post.id)} className="flex gap-2 relative">
                        <input
                          type="text"
                          placeholder="Adicione um comentário..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-yellow-500/50"
                        />
                        <button
                          type="submit"
                          disabled={!commentText.trim()}
                          className="absolute right-1 top-1 bottom-1 px-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-transparent disabled:text-zinc-600 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
