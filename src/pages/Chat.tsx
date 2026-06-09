import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, MessageSquare, ShieldAlert, AlertTriangle, Clock, Plus, Trash2, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { RankIcon } from '../components/RankIcon';
import { UserHoverCard } from './RedeSocial';

interface ChatMessage {
  id: string;
  userId: string;
  authorName: string;
  authorRole: string;
  authorAvatarUrl?: string;
  text?: string;
  imageUrl?: string;
  createdAt: string;
}

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mutedUntil, setMutedUntil] = useState<number>(0);
  const [subdivisaoMap, setSubdivisaoMap] = useState<Record<string, string[]>>({});
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [muteModal, setMuteModal] = useState<{ isOpen: boolean, targetId: string, targetName: string }>({ isOpen: false, targetId: '', targetName: '' });
  const [muteDuration, setMuteDuration] = useState<string>('600000');
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean, message: string }>({ isOpen: false, message: '' });
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean, message: string }>({ isOpen: false, message: '' });

  const showError = (message: string) => setErrorModal({ isOpen: true, message });
  const showSuccess = (message: string) => setSuccessModal({ isOpen: true, message });

  const isOfficer = user?.role === 'coronel' || user?.role === 'tenente-coronel';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChat = async () => {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setMutedUntil(data.mutedUntil || 0);
      }
    } catch (err) {
    }
  };

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

  useEffect(() => {
    fetchSubdivisoes();
    fetchChat();
    const interval = setInterval(fetchChat, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use selectedImageFile (state) NOT fileInputRef (may be cleared by onChange)
    if (!text.trim() && !selectedImageFile) return;
    
    setLoading(true);
    let imageUrl = '';

    try {
      // 1. Upload Image if exists
      if (selectedImageFile) {
        setUploadingImage(true);
        const file = selectedImageFile;
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64 })
        });
        
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          imageUrl = data.url;
          if (fileInputRef.current) fileInputRef.current.value = '';
          setSelectedImageFile(null);
        } else {
          showError('Erro ao fazer upload da imagem. Tente novamente.');
          setUploadingImage(false);
          setLoading(false);
          return;
        }
        setUploadingImage(false);
      }

      // 2. Send Message
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, imageUrl })
      });

      if (res.ok) {
        setText('');
        fetchChat();
      } else {
        const data = await res.json();
        showError(data.error || 'Erro ao enviar mensagem.');
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const res = await fetch(`/api/chat/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || 'Erro ao excluir mensagem.');
      } else {
        fetchChat();
      }
    } catch {
    }
  };

  const handleMute = async () => {
    try {
      const res = await fetch('/api/chat/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: muteModal.targetId, durationMs: parseInt(muteDuration) })
      });
      if (res.ok) {
        setMuteModal({ isOpen: false, targetId: '', targetName: '' });
        showSuccess(`${muteModal.targetName} foi silenciado com sucesso.`);
      } else {
        const data = await res.json();
        showError(data.error || 'Erro ao silenciar usuário.');
      }
    } catch {
    }
  };

  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (mutedUntil > Date.now()) {
      const interval = setInterval(() => {
        const diff = mutedUntil - Date.now();
        if (diff <= 0) {
          setMutedUntil(0);
          setTimeLeft('');
          clearInterval(interval);
        } else {
          const m = Math.floor(diff / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${m}m ${s}s`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [mutedUntil]);

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
      '1-soldado': '1º Soldado',
      '2-soldado': '2º Soldado',
      'aluno': 'Aluno Soldado'
    };
    return roles[role] || role;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-h-screen bg-zinc-950 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="border-b border-zinc-900 p-4 flex items-center justify-between shrink-0 shadow-sm bg-zinc-950 z-10">
        <div className="flex items-center gap-3">
          <div className="text-zinc-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              chat-corporacao
            </h1>
          </div>
        </div>
      </div>

      {/* Chat Box */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <MessageSquare className="w-10 h-10 mb-2 opacity-50" />
            <p>Nenhuma mensagem ainda. Inicie a conversa!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.userId === user?.id;
            const canDelete = isMe || isOfficer;
            // Check if previous message is from same user and within same minute (to group them discord style - keeping simple here for now)
            
            return (
              <div 
                key={msg.id} 
                className="group flex gap-4 hover:bg-zinc-900/50 p-1 px-4 -mx-4 rounded transition-colors relative"
              >
                {/* Avatar Left Side */}
                <div className="shrink-0 mt-0.5">
                  <UserHoverCard 
                    authorName={msg.authorName} 
                    authorRole={msg.authorRole} 
                    tags={subdivisaoMap[msg.userId] || []}
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                      {msg.authorAvatarUrl ? (
                        <img src={msg.authorAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <RankIcon role={msg.authorRole} className="w-6 h-6 text-zinc-400" />
                      )}
                    </div>
                  </UserHoverCard>
                </div>

                {/* Content Right Side */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <UserHoverCard 
                      authorName={msg.authorName} 
                      authorRole={msg.authorRole} 
                      tags={subdivisaoMap[msg.userId] || []}
                    >
                      <span className="font-medium text-zinc-100 cursor-pointer hover:underline">
                        {msg.authorName}
                      </span>
                    </UserHoverCard>
                    
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800/50">
                      <RankIcon role={msg.authorRole} className="w-3 h-3 text-yellow-500" />
                      {getLocalRankLabel(msg.authorRole)}
                    </span>
                    
                    <span className="text-xs text-zinc-400 ml-1">
                      {new Date(msg.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {msg.text && (
                    <div className="text-zinc-300 text-[15px] leading-relaxed break-words whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  )}

                  {msg.imageUrl && (
                    <div className="mt-2">
                      <img src={msg.imageUrl} alt="Imagem anexada" className="max-w-sm max-h-80 rounded-lg object-contain bg-zinc-900 cursor-pointer" />
                    </div>
                  )}
                </div>

                {/* Actions (Delete/Mute) on Hover */}
                <div className="absolute right-4 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-md shadow-sm">
                  {canDelete && (
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-zinc-900 rounded-l-md transition-colors"
                      title="Excluir Mensagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {isOfficer && !isMe && (
                    <button 
                      onClick={() => setMuteModal({ isOpen: true, targetId: msg.userId, targetName: msg.authorName })}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-zinc-900 rounded-r-md transition-colors border-l border-zinc-800"
                      title="Silenciar Usuário"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-950 shrink-0">
        {mutedUntil > Date.now() ? (
          <div className="w-full flex items-center justify-center gap-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 animate-pulse">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-bold tracking-widest uppercase">
              Chat Bloqueado - Tempo Restante: {timeLeft}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Image Preview Block */}
            {selectedImageFile && (
              <div className="bg-zinc-900 w-48 rounded-md p-2 relative flex flex-col items-center border border-zinc-800">
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedImageFile(null);
                    if(fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 transition-colors z-10"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="w-full h-32 bg-zinc-950 rounded flex items-center justify-center overflow-hidden mb-2">
                  <img src={URL.createObjectURL(selectedImageFile)} alt="Preview" className="max-h-full max-w-full object-contain" />
                </div>
                <span className="text-[10px] text-zinc-400 truncate w-full text-center">{selectedImageFile.name}</span>
              </div>
            )}
            
            <form onSubmit={handleSend} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-2 relative border border-zinc-800/80">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  if(e.target.files?.length) {
                    setSelectedImageFile(e.target.files[0]);
                  }
                }}
              />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full transition-colors flex items-center justify-center"
              title="Anexar Imagem"
              disabled={loading || uploadingImage}
            >
              <Plus className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Conversar em #chat-corporacao"
              className="flex-1 bg-transparent border-none outline-none text-zinc-200 placeholder-zinc-500 py-2"
              maxLength={2000}
              disabled={loading || uploadingImage}
            />

            {(loading || uploadingImage) ? (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            ) : (
              <button
                type="submit"
                disabled={(!text.trim() && !selectedImageFile)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </form>
          </div>
        )}
      </div>

      {/* Mute Modal */}
      {muteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Silenciar Usuário</h3>
                <p className="text-xs text-zinc-400 font-medium">Bloquear o acesso ao chat</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-zinc-300 mb-4">Você está prestes a silenciar <strong className="text-white">{muteModal.targetName}</strong>.</p>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Duração do Bloqueio</label>
              <select 
                value={muteDuration}
                onChange={(e) => setMuteDuration(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl p-3 outline-none"
              >
                <option value="600000">10 Minutos</option>
                <option value="3600000">1 Hora</option>
                <option value="43200000">12 Horas</option>
                <option value="86400000">24 Horas</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button 
                onClick={() => setMuteModal({ isOpen: false, targetId: '', targetName: '' })} 
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleMute} 
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/20"
              >
                Confirmar Punição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">Ocorreu um Erro</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{errorModal.message}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setErrorModal({ isOpen: false, message: '' })}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-zinc-700 hover:bg-zinc-600 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                <ShieldAlert className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">Ação Realizada</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{successModal.message}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSuccessModal({ isOpen: false, message: '' })}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
