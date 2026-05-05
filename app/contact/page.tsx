"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  MessageCircleCheck,
  Phone,
  Globe,
  Play,
  Camera,
  MapPin,
  Send,
  Home,
} from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");

    try {
      const { error } = await supabase.from("contact_messages").insert([
        {
          name: formData.name,
          email: formData.email,
          message: formData.message,
          status: "unread",
        },
      ]);

      if (error) throw error;

      setStatus("success");
      setFormData({ name: "", email: "", message: "" });
    } catch (error: any) {
      console.error("Supabase Error:", error.message);
      setStatus("error");
    }
  };

  const contactMethods = [
    {
      icon: Phone,
      title: "Phone",
      value: "+91 98920 160376",
      link: "tel:+9198920160376",
    },
    {
      icon: MessageCircleCheck,
      title: "WhatsApp",
      value: "+91 97024 85146",
      link: "https://wa.me/9702485146",
    },
    {
      icon: Globe,
      title: "Website",
      value: "www.cricsynclive.in",
      link: "https://www.cricsynclive.in",
    },
    {
      icon: MapPin,
      title: "Location",
      value: "Mumbai, Maharashtra",
      link: null,
    },
  ];

  const socialLinks = [
    {
      icon: Play,
      name: "YouTube",
      link: "https://www.youtube.com/@CricSyncLive",
      color: "hover:text-red-500 hover:bg-red-500/10",
    },
    {
      icon: Camera,
      name: "Instagram",
      link: "https://www.instagram.com/cricsynclive",
      color: "hover:text-pink-500 hover:bg-pink-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in">
        {/* Navigation Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-teal-500 uppercase tracking-widest mt-4 mb-8 transition-colors"
        >
          <Home size={14} /> Back to Hub
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-500">
            Get in Touch
          </h1>
          <p className="text-lg max-w-2xl mx-auto font-medium text-slate-600">
            Have a question about onboarding your tournament? <br />
            Need technical support? We are here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* --- LEFT: CONTACT DETAILS --- */}
          <div className="lg:col-span-5 space-y-8">
            <div className="p-8 rounded-[2.5rem] border bg-white border-slate-200 shadow-xl">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-widest mb-6 leading-tight">
                Contact <br />
                <span className="text-teal-500">Information</span>
              </h3>

              <div className="space-y-6">
                {contactMethods.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center bg-teal-50 text-teal-600">
                      <item.icon size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {item.title}
                      </p>
                      {item.link ? (
                        <a
                          href={item.link}
                          className="font-bold text-slate-900 hover:text-teal-500 transition-colors"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="font-bold text-slate-900">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Social Links */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-4 text-slate-500">
                  Follow Us
                </p>
                <div className="flex gap-4">
                  {socialLinks.map((social, i) => (
                    <a
                      key={i}
                      href={social.link}
                      target="_blank"
                      rel="noreferrer"
                      className={`p-3 rounded-xl border transition-all duration-300 flex items-center gap-2 bg-slate-50 border-slate-200 text-slate-600 ${social.color}`}
                    >
                      <social.icon size={18} />
                      <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline-block">
                        {social.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* --- RIGHT: SUPABASE FORM --- */}
          <div className="lg:col-span-7">
            <div className="p-8 md:p-10 rounded-[2.5rem] border relative overflow-hidden h-full bg-gradient-to-br from-teal-50/50 to-white border-teal-100 shadow-xl">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-widest mb-2">
                Send a Message
              </h3>
              <p className="text-sm font-medium mb-8 text-slate-500">
                Fill out the form below and our team will get back to you within
                24 hours.
              </p>

              {status === "success" ? (
                <div className="p-8 border rounded-3xl text-center flex flex-col items-center justify-center h-64 bg-teal-50 border-teal-200 text-teal-700">
                  <div className="w-16 h-16 bg-teal-500 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-teal-500/30">
                    <Send size={24} className="ml-1" />
                  </div>
                  <h4 className="text-xl font-black uppercase tracking-widest mb-2">
                    Message Sent!
                  </h4>
                  <p className="text-sm font-medium opacity-80">
                    We've received your inquiry and will be in touch shortly.
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-6 text-xs font-bold uppercase tracking-widest underline underline-offset-4"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 relative z-10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-slate-500">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Full Name"
                        required
                        className="w-full p-4 rounded-2xl border outline-none font-medium transition-colors bg-white border-slate-200 text-slate-900 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-slate-500">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="email@example.com"
                        required
                        className="w-full p-4 rounded-2xl border outline-none font-medium transition-colors bg-white border-slate-200 text-slate-900 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-slate-500">
                      Your Message
                    </label>
                    <textarea
                      placeholder="Tell us about your tournament..."
                      required
                      rows={6}
                      className="w-full p-4 rounded-2xl border outline-none font-medium resize-none transition-colors bg-white border-slate-200 text-slate-900 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                    />
                  </div>

                  {status === "error" && (
                    <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-200">
                      Failed to send message. Please try again later.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full py-4 bg-teal-600 text-white font-black rounded-2xl uppercase tracking-widest hover:bg-teal-500 transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-70 disabled:active:scale-100"
                  >
                    {status === "submitting" ? (
                      <span className="animate-pulse">Sending...</span>
                    ) : (
                      <>
                        Send Message <Send size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
