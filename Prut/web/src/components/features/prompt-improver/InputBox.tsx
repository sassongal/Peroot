"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wand2 } from "lucide-react";

interface InputBoxProps {
  onEnhance: (input: string) => void;
  isLoading?: boolean;
}

export function InputBox({ onEnhance, isLoading = false }: InputBoxProps) {
  const [input, setInput] = useState("");

  const handleEnhance = () => {
    if (!input.trim()) return;
    onEnhance(input);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>המקפצה לפרומפט שלך</CardTitle>
        <CardDescription>
          כתוב את הרעיון הגולמי שלך, ואנחנו נהפוך אותו לפרומפט מקצועי.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="לדוגמה: תכתוב לי פוסט ללינקדאין על חשיבות ה-AI בשיווק..."
          className="min-h-[150px] text-lg resize-none p-4"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          dir="rtl"
        />
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-muted/20 p-4">
        <span className="text-xs text-muted-foreground">
          {input.length} תווים
        </span>
        <Button 
            onClick={handleEnhance} 
            disabled={!input.trim() || isLoading}
            className="gap-2 text-md px-6 py-6 h-auto"
        >
          {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
              <Wand2 className="w-5 h-5" />
          )}
          פרט לי (Enhance)
        </Button>
      </CardFooter>
    </Card>
  );
}
