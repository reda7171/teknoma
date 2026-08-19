'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, Instagram, Facebook, User, Clock, Loader2, CheckCheck, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type Conversation = {
    id: string
    platform: string
    platformId: string
    customerName: string | null
    customerAvatar: string | null
    lastMessageAt: string
    unreadCount: number
    messages?: Message[]
}

type Message = {
    id: string
    content: string
    direction: 'INBOUND' | 'OUTBOUND'
    createdAt: string
}

export default function InboxClient() {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [loadingConvs, setLoadingConvs] = useState(true)
    const [loadingMsgs, setLoadingMsgs] = useState(false)
    const [sending, setSending] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Fetch conversations (Poll every 10s)
    const fetchConversations = async (silent = false) => {
        if (!silent) setLoadingConvs(true)
        try {
            const res = await fetch('/api/admin/inbox/conversations')
            const data = await res.json()
            if (data.conversations) {
                setConversations(data.conversations)
            }
        } catch (err) {
            console.error("Error fetching conversations:", err)
        } finally {
            setLoadingConvs(false)
        }
    }

    // Fetch messages for active conversation
    const fetchMessages = async (convId: string, silent = false) => {
        if (!silent) setLoadingMsgs(true)
        try {
            const res = await fetch(`/api/admin/inbox/messages?conversationId=${convId}`)
            const data = await res.json()
            if (data.messages) {
                setMessages(data.messages)
                
                // Update local unread count if we opened it
                setConversations(prev => prev.map(c => 
                    c.id === convId ? { ...c, unreadCount: 0 } : c
                ))
            }
        } catch (err) {
            console.error("Error fetching messages:", err)
        } finally {
            setLoadingMsgs(false)
        }
    }

    // Initial load + Polling
    useEffect(() => {
        fetchConversations()
        
        const intervalId = setInterval(() => {
            fetchConversations(true)
            if (selectedConvId) {
                fetchMessages(selectedConvId, true)
            }
        }, 10000)
        
        return () => clearInterval(intervalId)
    }, [selectedConvId])

    const handleSelectConversation = (convId: string) => {
        setSelectedConvId(convId)
        fetchMessages(convId)
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || !selectedConvId) return

        setSending(true)
        const textToSend = newMessage.trim()
        setNewMessage("") // Optimistic clear
        
        // Optimistic UI update
        const optimisticMsg: Message = {
            id: `temp-${Date.now()}`,
            content: textToSend,
            direction: 'OUTBOUND',
            createdAt: new Date().toISOString()
        }
        setMessages(prev => [...prev, optimisticMsg])

        try {
            const res = await fetch('/api/admin/inbox/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: selectedConvId, text: textToSend })
            })
            
            if (res.ok) {
                fetchMessages(selectedConvId, true)
                fetchConversations(true)
            }
        } catch (error) {
            console.error("Failed to send message:", error)
        } finally {
            setSending(false)
        }
    }

    const activeConversation = conversations.find(c => c.id === selectedConvId)

    return (
        <div className="flex h-full border-t border-gray-100">
            {/* Sidebar (List of conversations) */}
            <div className={`w-full md:w-80 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0 ${selectedConvId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-200">
                    <input 
                        type="text"
                        placeholder="Rechercher..."
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loadingConvs && conversations.length === 0 ? (
                        <div className="p-8 flex justify-center">
                            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500 font-medium">
                            Aucune conversation.
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => handleSelectConversation(conv.id)}
                                className={`w-full p-4 flex items-start gap-3 border-b border-gray-100 transition-colors text-left
                                    ${selectedConvId === conv.id ? 'bg-black text-white' : 'hover:bg-gray-100'}
                                `}
                            >
                                <div className="relative">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedConvId === conv.id ? 'bg-gray-800' : 'bg-gray-200 text-gray-500'}`}>
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-sm">
                                        {conv.platform === 'INSTAGRAM' ? (
                                            <Instagram className="w-3 h-3 text-pink-500" />
                                        ) : (
                                            <Facebook className="w-3 h-3 text-blue-600" />
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`font-bold text-sm truncate ${selectedConvId === conv.id ? 'text-white' : 'text-gray-900'}`}>
                                            {conv.customerName || conv.platformId}
                                        </span>
                                        <span className={`text-[10px] whitespace-nowrap ${selectedConvId === conv.id ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {format(new Date(conv.lastMessageAt), 'HH:mm')}
                                        </span>
                                    </div>
                                    <p className={`text-xs truncate ${selectedConvId === conv.id ? 'text-gray-300' : 'text-gray-500'} ${conv.unreadCount > 0 ? 'font-bold' : ''}`}>
                                        {conv.messages?.[0]?.content || "Nouvelle conversation"}
                                    </p>
                                </div>
                                {conv.unreadCount > 0 && (
                                    <div className="bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                        {conv.unreadCount}
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col bg-[#FDFDFD] relative ${!selectedConvId ? 'hidden md:flex' : 'flex'}`}>
                {activeConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                {/* Mobile Back Button */}
                                <button onClick={() => setSelectedConvId(null)} className="md:hidden mr-2 p-2 -ml-2 text-gray-500">
                                    ←
                                </button>
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 text-gray-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">
                                        {activeConversation.customerName || activeConversation.platformId}
                                    </h3>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                        {activeConversation.platform === 'INSTAGRAM' ? <Instagram className="w-3 h-3 text-pink-500" /> : <Facebook className="w-3 h-3 text-blue-600" />}
                                        {activeConversation.platform}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {loadingMsgs && messages.length === 0 ? (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isOutbound = msg.direction === 'OUTBOUND'
                                    return (
                                        <div key={msg.id || index} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${isOutbound ? 'bg-black text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'}`}>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                <div className={`text-[9px] mt-1 flex items-center gap-1 ${isOutbound ? 'text-gray-400 justify-end' : 'text-gray-500'}`}>
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(msg.createdAt), "HH:mm")}
                                                    {isOutbound && <CheckCheck className="w-3 h-3 ml-1" />}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-100">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Écrivez un message..."
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    className="flex-1 bg-gray-100 border-transparent rounded-full px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                                />
                                <button 
                                    type="submit"
                                    disabled={!newMessage.trim() || sending}
                                    className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-900 disabled:opacity-50 transition-all active:scale-95 shrink-0"
                                >
                                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <MessageCircle className="w-16 h-16 mb-4 text-gray-200" />
                        <p className="font-bold text-gray-500">Sélectionnez une conversation</p>
                        <p className="text-sm mt-1">pour afficher les messages</p>
                    </div>
                )}
            </div>
        </div>
    )
}
