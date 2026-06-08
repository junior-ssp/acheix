"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { getToken } from "firebase/messaging";
import { Bell, Send } from "lucide-react";
import { getFirebaseDb, getFirebaseMessaging, isFirebaseClientConfigured } from "@/lib/firebase-client";

type ChatMessage = {
  id: string;
  text: string;
  author: string;
};

export function MessagesClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    const messagesQuery = query(collection(db, "demo_chats", "public", "messages"), orderBy("createdAt", "desc"), limit(30));
    return onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ChatMessage, "id">) })).reverse());
    });
  }, []);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = String(data.get("message") ?? "").trim();
    if (!text) return;
    const db = getFirebaseDb();
    if (!db) {
      setStatus("Configure Firebase Firestore para ativar o chat em tempo real.");
      return;
    }
    await addDoc(collection(db, "demo_chats", "public", "messages"), {
      text,
      author: "Usuário",
      createdAt: serverTimestamp()
    });
    form.reset();
  }

  async function enablePush() {
    const messaging = await getFirebaseMessaging();
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!messaging || !vapidKey) {
      setStatus("Configure Firebase Messaging e VAPID key para ativar push.");
      return;
    }
    const token = await getToken(messaging, { vapidKey });
    setStatus(token ? "Notificações push ativadas neste navegador." : "Não foi possível ativar push.");
  }

  return (
    <section className="mt-6 grid gap-4">
      {!isFirebaseClientConfigured() && (
        <p className="rounded-md border border-yellow-400/25 bg-yellow-400/10 p-3 text-sm font-bold text-yellow-200">
          Preencha as credenciais Firebase no .env apenas se quiser ativar chat em tempo real e push.
        </p>
      )}
      <div className="grid max-h-80 gap-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3">
        {messages.length ? messages.map((message) => (
          <div key={message.id} className="rounded-xl bg-white/10 p-3">
            <strong className="block text-xs text-yellow-300">{message.author}</strong>
            <span>{message.text}</span>
          </div>
        )) : <p className="text-sm text-neutral-400">As mensagens em tempo real aparecem aqui.</p>}
      </div>
      <form onSubmit={sendMessage} className="flex gap-2">
        <input name="message" placeholder="Digite uma mensagem" className="input" />
        <button className="grid h-12 w-12 shrink-0 place-items-center rounded-md btn-gold" title="Enviar"><Send size={18} /></button>
      </form>
      <button type="button" onClick={enablePush} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/10 px-4 font-bold">
        <Bell size={18} />
        Ativar notificações push
      </button>
      {status && <p className="text-sm text-yellow-300">{status}</p>}
    </section>
  );
}

