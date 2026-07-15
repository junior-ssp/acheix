"use client";
import { Check, CheckCheck, Pencil, Trash2, X } from "lucide-react";

export type ThreadMessage = { id:string;body:string;createdAt:string;editedAt:string|null;readAt:string|null;mine:boolean;pending?:boolean;failed?:boolean };

export function MessageBubble({message,contactName,editing,editBody,setEditBody,beginEdit,cancelEdit,saveEdit,deleteMessage,busy}:{message:ThreadMessage;contactName:string;editing:boolean;editBody:string;setEditBody:(v:string)=>void;beginEdit:(m:ThreadMessage)=>void;cancelEdit:()=>void;saveEdit:(id:string)=>Promise<void>;deleteMessage:(id:string)=>Promise<void>;busy:boolean}){
  const editable=message.mine&&!message.pending&&!message.failed&&!message.readAt;
  const color=message.mine?"rounded-br-md border-emerald-300/25 bg-[#128c55] text-white":"rounded-bl-md border-yellow-200/35 bg-yellow-300 text-black";
  return <div className={`flex max-w-[82%] flex-col ${message.mine?"ml-auto items-end":"mr-auto items-start"}`}>
    <span className="mb-0.5 px-1 text-[9px] font-black uppercase tracking-wide text-neutral-500">{message.mine?"Você":contactName}</span>
    <div className={`relative min-w-20 rounded-2xl border px-3 py-2 shadow-sm ${color}`}>
      {editing?<div className="min-w-[220px]"><textarea autoFocus value={editBody} onChange={e=>setEditBody(e.target.value)} maxLength={1000} className="min-h-20 w-full resize-none rounded-xl bg-white/90 p-3 font-semibold text-black outline-none"/><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={cancelEdit} className="grid h-8 w-8 place-items-center rounded-full bg-black/10"><X size={16}/></button><button type="button" disabled={busy||!editBody.trim()} onClick={()=>void saveEdit(message.id)} className="grid h-8 w-8 place-items-center rounded-full bg-black text-yellow-300 disabled:opacity-50"><Check size={16}/></button></div></div>:<p className="whitespace-pre-wrap break-words text-[14px] font-semibold leading-snug sm:text-[15px]">{message.body}</p>}
      {!editing?<Meta message={message}/>:null}
      {editable&&!editing?<div className="absolute -left-16 top-1/2 flex -translate-y-1/2 gap-1"><button type="button" disabled={busy} onClick={()=>beginEdit(message)} className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-neutral-900 text-yellow-300 shadow-lg disabled:opacity-50" aria-label="Editar mensagem"><Pencil size={13}/></button><button type="button" disabled={busy} onClick={()=>void deleteMessage(message.id)} className="grid h-7 w-7 place-items-center rounded-full border border-red-400/30 bg-neutral-900 text-red-300 shadow-lg disabled:opacity-50" aria-label="Excluir mensagem"><Trash2 size={13}/></button></div>:null}
    </div>
  </div>;
}

function Meta({message}:{message:ThreadMessage}){
  const time=new Date(message.createdAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  return <div className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] font-bold ${message.mine?"text-white/70":"text-black/55"}`}><span>{message.editedAt?"editada · ":""}{time}</span>{message.mine?(message.pending?<span>enviando</span>:message.failed?<span>falhou</span>:message.readAt?<><CheckCheck size={14}/><span>lida</span></>:<><Check size={13}/><span>enviada</span></>):null}</div>;
}
