import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Heart, MessageCircle, Share2, Film, Loader2 } from 'lucide-react';
import { RankIcon } from '../components/RankIcon';

interface PostComment {
  id: string;
  userId: string;
  authorName: string;
  authorRole: string;
  authorAvatarUrl?: string;
  authorCoverUrl?: string;
  text: string;
  createdAt: string;
}

interface PublicPostData {
  id: string;
  videoUrl: string;
  description: string;
  authorName: string;
  authorRole: string;
  authorAvatarUrl?: string;
  authorCoverUrl?: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  comments: PostComment[];
}

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

export const PublicPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<PublicPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts/public/${id}`);
      if (!res.ok) throw new Error('Clipe não encontrado ou indisponível.');
      const data = await res.json();
      setPost(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderVideo = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        return (
          <iframe
            className="w-full aspect-video rounded-xl border border-zinc-800"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }
    // Fallback normal video
    return (
      <video src={url} controls className="w-full aspect-video bg-black rounded-xl border border-zinc-800" />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-sans text-yellow-500 gap-3">
        <Loader2 className="w-10 h-10 animate-spin" />
        <span className="text-xs font-bold tracking-widest uppercase">Carregando registro...</span>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-sans text-rose-500 gap-4">
        <Film className="w-16 h-16 opacity-50" />
        <h2 className="text-xl font-black uppercase tracking-widest">{error || 'Registro não encontrado'}</h2>
        <Link to="/login" className="px-6 py-3 mt-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-colors">
          Acessar Sistema
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-sans relative overflow-hidden flex flex-col">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay pointer-events-none fixed" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-yellow-500/5 rounded-full blur-[150px] pointer-events-none fixed" />
      
      {/* Header */}
      <div className="w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-zinc-100 font-black text-sm uppercase tracking-widest">COOP</span>
              <span className="text-zinc-500 text-[9px] uppercase tracking-widest">Plataforma Oficial</span>
            </div>
          </div>
          <Link to="/login" className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-colors">
            Fazer Login
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:py-12 relative z-10">
        <div className="glass-panel border border-zinc-800/80 rounded-2xl bg-zinc-950/60 shadow-2xl overflow-hidden">
          
          {/* Post Header */}
          <div className="p-4 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900/40 relative overflow-hidden">
            {/* Faint Cover Background */}
            {post.authorCoverUrl && (
              <div className="absolute inset-0 opacity-[0.03] z-0">
                <img src={post.authorCoverUrl} className="w-full h-full object-cover" />
              </div>
            )}
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center shadow-inner overflow-hidden flex-shrink-0">
                {post.authorAvatarUrl ? (
                  <img src={post.authorAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <RankIcon role={post.authorRole} className="w-7 h-7 text-zinc-400" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-zinc-100 text-base">{post.authorName}</h4>
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest mt-1">
                  <span className="text-yellow-500">{getLocalRankLabel(post.authorRole)}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-500">
                    {new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} às {new Date(post.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Video Player */}
          <div className="p-0 bg-black">
            {renderVideo(post.videoUrl)}
          </div>

          {/* Post Info Footer */}
          <div className="p-6 bg-zinc-950">
            {post.description && (
              <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed mb-6">
                {post.description}
              </p>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-zinc-900">
              <div className="flex gap-6">
                <div className="flex items-center gap-2 text-zinc-400 group cursor-default">
                  <div className="p-2 rounded-full bg-zinc-900 border border-zinc-800 group-hover:border-rose-500/30 group-hover:bg-rose-500/10 transition-colors">
                    <Heart className="w-4 h-4 text-rose-500" />
                  </div>
                  <span className="text-sm font-bold">{post.likesCount} curtidas</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 group cursor-default">
                  <div className="p-2 rounded-full bg-zinc-900 border border-zinc-800 group-hover:border-blue-500/30 group-hover:bg-blue-500/10 transition-colors">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-sm font-bold">{post.commentsCount} comentários</span>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link do clipe copiado para a área de transferência!');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl transition-colors text-xs font-bold tracking-widest uppercase"
              >
                <Share2 className="w-4 h-4 text-yellow-500" />
                Copiar Link
              </button>
            </div>

            {/* Comments List */}
            {post.comments && post.comments.length > 0 && (
              <div className="mt-8 pt-8 border-t border-zinc-900 space-y-4">
                <h5 className="text-zinc-100 font-bold text-lg mb-4">Comentários</h5>
                <div className="space-y-4">
                  {post.comments.map(c => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {c.authorAvatarUrl ? (
                          <img src={c.authorAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <RankIcon role={c.authorRole} className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>
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
                  ))}
                </div>
              </div>
            )}
          </div>
          
        </div>
        
        <div className="text-center mt-12 text-zinc-600 text-xs font-bold uppercase tracking-widest">
          Este registro é mantido pelo Comando Ostensivo de Operações Policiais
        </div>
      </div>
    </div>
  );
};

export default PublicPost;
