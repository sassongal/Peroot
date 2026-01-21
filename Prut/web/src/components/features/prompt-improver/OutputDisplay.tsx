"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Share2 } from "lucide-react";
import { useState } from "react";

interface OutputDisplayProps {
  prompt: string;
}

export function OutputDisplay({ prompt }: OutputDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!prompt) return null;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-md border-primary/20 bg-primary/5 mt-8 animate-in fade-in slide-in-from-bottom-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold text-primary">הפרומפט המשופר שלך:</CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-background rounded-md p-4 border text-sm leading-relaxed whitespace-pre-wrap font-mono" dir="ltr">
          {prompt}
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          שתף
        </Button>
        <Button size="sm" onClick={handleCopy} className="gap-2">
           {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
           העתק לקליפבורד
        </Button>
      </CardFooter>
    </Card>
  );
}
