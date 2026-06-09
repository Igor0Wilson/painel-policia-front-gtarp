import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Camera, UploadCloud, Save, AlertTriangle, CheckCircle } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, reloadUser } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [subdivisoes, setSubdivisoes] = useState<string[]>([]);
  
  const [avatarBase64, setAvatarBase64] = useState<string>('');
  const [coverBase64, setCoverBase64] = useState<string>('');
  
  const [previewAvatar, setPreviewAvatar] = useState(user?.avatarUrl || '');
  const [previewCover, setPreviewCover] = useState(user?.coverUrl || '');
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPreviewAvatar(user.avatarUrl || null);
      setPreviewCover(user.coverUrl || null);
      fetchUserSubdivisoes();
    }
  }, [user]);

  const fetchUserSubdivisoes = async () => {
    try {
      const res = await fetch('/api/subdivisoes');
      if (res.ok) {
        const data = await res.json();
        const subs: string[] = [];
        data.forEach((sub: any) => {
          if (sub.comandoId === user?.id) {
            subs.push(sub.name);
          } else if (sub.operators.some((op: any) => op.userId === user?.id)) {
            subs.push(sub.name);
          }
        });
        setSubdivisoes([...new Set(subs)]);
      }
    } catch (err) {}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'A imagem deve ter no máximo 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      if (type === 'avatar') {
        setAvatarBase64(b64);
        setPreviewAvatar(b64);
      } else {
        setCoverBase64(b64);
        setPreviewCover(b64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'O nome não pode ficar vazio.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      let finalAvatarUrl = user?.avatarUrl;
      let finalCoverUrl = user?.coverUrl;

      // Upload novo avatar pro Cloudinary se tiver mudado
      if (avatarBase64) {
        const resAv = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: avatarBase64, oldUrl: user?.avatarUrl })
        });
        if (resAv.ok) {
          const data = await resAv.json();
          finalAvatarUrl = data.url;
        } else {
          throw new Error('Falha ao enviar a foto de perfil.');
        }
      }

      // Upload nova capa pro Cloudinary se tiver mudado
      if (coverBase64) {
        const resCov = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: coverBase64, oldUrl: user?.coverUrl })
        });
        if (resCov.ok) {
          const data = await resCov.json();
          finalCoverUrl = data.url;
        } else {
          throw new Error('Falha ao enviar a foto de capa.');
        }
      }

      // Salva perfil
      const payload: any = { name };
      if (password) payload.password = password;
      payload.avatarUrl = finalAvatarUrl;
      payload.coverUrl = finalCoverUrl;

      const profileRes = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!profileRes.ok) throw new Error('Erro ao salvar perfil.');

      setMessage({ type: 'success', text: 'Perfil salvo com sucesso!' });
      await reloadUser();

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Ocorreu um erro.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-outfit font-black text-zinc-100">Meu Perfil</h1>
        <p className="text-sm text-zinc-400 mt-1 font-medium">Edite suas informações e personalize a sua aparência.</p>
      </div>

      <div className="glass-panel border border-zinc-800 rounded-3xl w-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* Capa */}
        <div className="relative h-48 bg-zinc-900 border-b border-zinc-800">
          {previewCover ? (
            <img src={previewCover} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-zinc-900 to-zinc-800" />
          )}
          
          <button 
            onClick={() => coverInputRef.current?.click()}
            className="absolute top-4 right-4 px-4 py-2 bg-black/60 hover:bg-black/80 text-white font-bold text-xs flex items-center gap-2 rounded-xl backdrop-blur-md transition-colors"
            title="Alterar Capa"
          >
            <Camera className="w-4 h-4" /> ALTERAR CAPA
          </button>
        </div>

        <div className="p-6 relative pt-0">
          {/* Avatar (Meio fora, meio dentro) */}
          <div className="relative w-28 h-28 -mt-14 mx-auto mb-6">
            <div className="w-full h-full rounded-2xl bg-zinc-800 border-4 border-zinc-950 overflow-hidden flex items-center justify-center shadow-xl">
              {previewAvatar ? (
                <img src={previewAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-zinc-500">{name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <button 
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg border-[3px] border-zinc-950 transition-colors shadow-lg"
              title="Alterar Avatar"
            >
              <UploadCloud className="w-5 h-5" />
            </button>
          </div>

          <input type="file" accept="image/*" ref={avatarInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'avatar')} />
          <input type="file" accept="image/*" ref={coverInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'cover')} />

          <div className="flex flex-col items-center mb-8 space-y-3">
            <h2 className="text-xl font-outfit font-bold text-zinc-100">{user?.name}</h2>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
              {user?.courseTags?.map((tag: string, i: number) => (
                <span key={`course-${i}`} className="px-2.5 py-1 text-[10px] rounded border bg-yellow-900/30 text-yellow-400 border-yellow-700/50 uppercase font-bold tracking-widest">
                  {tag}
                </span>
              ))}
              {subdivisoes.map((tag, i) => (
                <span key={`sub-${i}`} className="px-2.5 py-1 text-[10px] rounded border bg-indigo-900/30 text-indigo-400 border-indigo-700/50 uppercase font-bold tracking-widest">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 mb-6 text-sm font-bold shadow-lg ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {message.text}
            </div>
          )}

          <div className="space-y-5 max-w-lg mx-auto">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                Nome de Exibição
              </label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:border-yellow-500/50 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                Nova Senha (opcional)
              </label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Deixe em branco para não alterar"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:border-yellow-500/50 outline-none"
              />
            </div>
            
            <div className="pt-4 pb-2">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 disabled:bg-zinc-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(202,138,4,0.3)]"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saving ? 'SALVANDO ALTERAÇÕES...' : 'SALVAR PERFIL'}
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
