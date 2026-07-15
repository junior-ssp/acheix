"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, MessageCircle, RefreshCw, Search, Trash2, X } from "lucide-react";
import { syncMessageBadgeFromServer } from "@/lib/app-badge-client";

type Conversation = { id:string; category:"VEHICLES"|"REAL_ESTATE"|"SERVICES"; direction:"RECEIVED"|"SENT"; unreadCount:number; lastMessage:{body:string;createdAt:string;mine:boolean}; contact:{name:string;email:string|null}; target:{kind:"LISTING"|"SERVICE";title:string;city?:string|null;state?:string|null;imageUrl?:string|null;href:string} };
type Filter = "ALL"|"RECEIVED"|"SENT";

export function MessagesInbox() {
  const [items,setItems]=useState<Conversation[]>([]), [filter,setFilter]=useState<Filter>("ALL"), [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true), [error,setError]=useState(""), [selecting,setSelecting]=useState(false), [deleting,setDeleting]=useState(false);
  const [selected,setSelected]=useState<Set<string>>(new Set());
  async function load(){
    setError(""); const response=await fetch("/api/messages/conversations",{cache:"no-store"}).catch(()=>null); setLoading(false);
    if(!response?.ok){setError("Não foi possível carregar suas mensagens agora.");return;}
    const data=await response.json().catch(()=>null); setItems(Array.isArray(data?.conversations)?data.conversations:[]);
    await syncMessageBadgeFromServer();
  }
  useEffect(()=>{void load();const timer=window.setInterval(load,15000);return()=>window.clearInterval(timer);},[]);
  const visible=useMemo(()=>{const text=query.trim().toLowerCase();return items.filter(item=>(filter==="ALL"||item.direction===filter)&&(!text||[item.contact.name,item.contact.email,item.target.title,item.lastMessage.body].filter(Boolean).some(value=>String(value).toLowerCase().includes(text))));},[items,filter,query]);
  const stop=()=>{setSelecting(false);setSelected(new Set());};
  const toggle=(id:string)=>setSelected(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next;});
  async function remove(all=false){
    const ids=[...selected]; if((!all&&!ids.length)||deleting)return; const quantity=all?items.length:ids.length;
    if(!window.confirm(all?"Excluir todas as conversas da sua caixa de mensagens?":`Excluir ${quantity} conversa${quantity===1?"":"s"} selecionada${quantity===1?"":"s"}?`))return;
    setDeleting(true); const response=await fetch("/api/messages/conversations",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify(all?{all:true}:{ids})}).catch(()=>null); setDeleting(false);
    if(!response?.ok){const data=await response?.json().catch(()=>null);setError(data?.error??"Não foi possível excluir as conversas.");return;}
    setItems(current=>all?[]:current.filter(item=>!selected.has(item.id))); stop();
  }
  const unread=items.reduce((sum,item)=>sum+item.unreadCount,0), received=items.filter(i=>i.direction==="RECEIVED").length, sent=items.length-received;
  const allVisible=visible.length>0&&visible.every(item=>selected.has(item.id));
  return <main className="min-h-screen bg-black pb-24 text-white"><div className="mx-auto max-w-2xl px-4 pt-8">
    <header className="flex items-center justify-between gap-3"><div><h1 className="text-4xl font-black">Chat</h1><p className="mt-1 text-sm font-semibold text-neutral-400">{unread?`${unread} mensagem${unread===1?"":"s"} não lida${unread===1?"":"s"}`:"Suas conversas do Achei X"}</p></div><div className="flex gap-2">
      {items.length?<button type="button" onClick={()=>selecting?stop():setSelecting(true)} className="grid h-11 min-w-11 place-items-center rounded-full border border-neutral-700 px-3 text-sm font-black">{selecting?<X size={20}/>:"Selecionar"}</button>:null}
      <button type="button" onClick={()=>void load()} className="grid h-11 w-11 place-items-center rounded-full border border-neutral-700" aria-label="Atualizar"><RefreshCw size={20}/></button>
    </div></header>
    {selecting?<div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
      <button type="button" onClick={()=>setSelected(allVisible?new Set():new Set(visible.map(i=>i.id)))} className="rounded-full border border-neutral-700 px-4 py-2 text-sm font-black">{allVisible?"Desmarcar todas":"Selecionar todas"}</button>
      <button type="button" disabled={!selected.size||deleting} onClick={()=>void remove()} className="grid h-10 w-10 place-items-center rounded-full bg-red-600 disabled:opacity-40" aria-label="Excluir selecionadas"><Trash2 size={19}/></button>
      <button type="button" disabled={deleting} onClick={()=>void remove(true)} className="ml-auto rounded-full bg-red-600 px-4 py-2 text-sm font-black disabled:opacity-50">{deleting?"Excluindo...":"Excluir todas"}</button>
    </div>:null}
    <label className="mt-6 flex h-12 items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950 px-4"><Search size={20} className="text-neutral-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por pessoa, anúncio ou mensagem" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-neutral-500"/></label>
    <div className="mt-5 flex gap-2 overflow-x-auto pb-1"><FilterButton active={filter==="ALL"} click={()=>setFilter("ALL")} label="Todas" count={items.length}/><FilterButton active={filter==="RECEIVED"} click={()=>setFilter("RECEIVED")} label="Recebidas" count={received}/><FilterButton active={filter==="SENT"} click={()=>setFilter("SENT")} label="Enviadas" count={sent}/></div>
    <section className="mt-5">{visible.map(item=><Row key={item.id} item={item} selecting={selecting} checked={selected.has(item.id)} toggle={toggle}/>)}
      {!loading&&!visible.length?<div className="grid min-h-64 place-items-center text-center"><div><MessageCircle className="mx-auto text-neutral-700" size={42}/><p className="mt-3 text-lg font-black">Nenhuma conversa encontrada</p><p className="mt-1 text-sm text-neutral-500">Quando alguém chamar você, a conversa aparece aqui.</p></div></div>:null}
      {loading?<p className="py-8 text-center text-sm font-bold text-neutral-500">Carregando mensagens...</p>:null}{error?<p className="py-4 text-center text-sm font-bold text-red-400">{error}</p>:null}
    </section>
  </div></main>;
}

function Row({item,selecting,checked,toggle}:{item:Conversation;selecting:boolean;checked:boolean;toggle:(id:string)=>void}){
  const content=<>{selecting?<span className={`mt-7 grid h-6 w-6 shrink-0 place-items-center rounded border ${checked?"border-yellow-300 bg-yellow-300 text-black":"border-neutral-600"}`}>{checked?<Check size={17}/>:null}</span>:null}<Thumb item={item}/><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-black uppercase text-neutral-400">{item.target.title}</p><p className="mt-1 flex items-center gap-1.5 truncate text-xl font-black">{item.contact.name}{item.unreadCount?<span className="h-2 w-2 rounded-full bg-yellow-300"/>:null}</p></div><time className="shrink-0 text-sm font-semibold text-neutral-400">{relativeDate(item.lastMessage.createdAt)}</time></div><p className={`mt-1 line-clamp-1 text-base ${item.unreadCount?"font-black text-yellow-300":"font-normal text-white"}`}>{item.lastMessage.mine?"Você: ":""}{item.lastMessage.body}</p><p className="mt-1 truncate text-xs font-semibold text-neutral-500">{[categoryLabel(item.category),item.target.city&&item.target.state?`${item.target.city}, ${item.target.state}`:null].filter(Boolean).join(" - ")}</p></div></>;
  return selecting?<button type="button" onClick={()=>toggle(item.id)} className={`flex w-full gap-3 border-b py-4 text-left ${checked?"border-yellow-300/30 bg-yellow-300/[0.06]":"border-neutral-800"}`}>{content}</button>:<Link href={item.target.href as any} prefetch={false} className={`flex gap-3 border-b py-4 ${item.direction==="RECEIVED"?"border-emerald-400/25 bg-emerald-500/[0.08]":"border-neutral-800"}`}>{content}</Link>;
}
function FilterButton({active,click,label,count}:{active:boolean;click:()=>void;label:string;count:number}){return <button type="button" onClick={click} className={`h-12 shrink-0 rounded-full border px-5 text-lg font-black ${active?"border-yellow-300 bg-yellow-300 text-black":"border-neutral-700 bg-black"}`}>{label} <span className="ml-1 text-sm">{count}</span></button>}
function Thumb({item}:{item:Conversation}){return item.target.imageUrl?<img src={item.target.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover"/>:<span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-2xl font-black">{item.target.kind==="SERVICE"?"S":item.target.title.charAt(0).toUpperCase()}</span>}
function relativeDate(value:string){const date=new Date(value),now=new Date(),days=Math.round((new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()-new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime())/86400000);return days===0?date.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):days===1?"Ontem":date.toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","")}
function categoryLabel(value:Conversation["category"]){return value==="VEHICLES"?"Veículos":value==="REAL_ESTATE"?"Imóveis":"Serviços"}
