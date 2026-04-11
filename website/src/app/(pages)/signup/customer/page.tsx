"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function CustomerSignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { user_type: "customer", display_name: name },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Sign in immediately
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError("Account created! Please sign in.");
        setLoading(false);
        return;
      }

      router.push("/browse");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="absolute inset-0 -z-10">
        <Image
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop&crop=center"
          alt="Mountain landscape"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/55" />
      </div>

      <div className="w-full max-w-md px-6 py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-serif mb-2 text-white">Create Account</h1>
          <p className="text-white/50 text-sm">Buy art, track orders, build your collection</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-sm p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full px-4 py-3 bg-background border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-accent/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-background border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-accent/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 bg-background border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-accent/60 transition-colors"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-accent text-white text-sm font-semibold uppercase tracking-wider rounded-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-white/50">
          Already have an account?{" "}
          <Link href="/login" className="text-white hover:text-accent transition-colors">Sign in</Link>
          {" · "}
          <Link href="/signup" className="text-white hover:text-accent transition-colors">Other account types</Link>
        </p>
      </div>
    </div>
  );
}
