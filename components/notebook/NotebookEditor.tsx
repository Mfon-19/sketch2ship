"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  List,
  Link2,
  ImagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const toolbarBase =
  "rounded-md p-1.5 text-[#a39f98] transition hover:bg-[#f3eee5] hover:text-[#2f2d2a]";

const EditorToolbar = ({ editor }: { editor: ReturnType<typeof useEditor> }) => {
  if (!editor) return null;

  return (
    <div className="mb-3 flex items-center gap-2 text-sm">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(toolbarBase, "font-editor text-lg italic font-bold")}
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(toolbarBase, "font-editor text-lg italic")}
        title="Italic"
      >
        I
      </button>
      <span className="mx-1 h-4 w-px bg-[#d5cfc3]" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={toolbarBase}
        title="Bulleted list"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          const url = window.prompt("Enter URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        className={toolbarBase}
        title="Link"
      >
        <Link2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          const url = window.prompt("Enter image URL");
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }}
        className={toolbarBase}
        title="Image"
      >
        <ImagePlus className="h-4 w-4" />
      </button>
    </div>
  );
};

function useDebouncedCallback(
  callback: (content: string) => void,
  delay: number
): (content: string) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (content: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(content);
      }, delay);
    },
    [delay]
  );
}

interface NotebookEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function NotebookEditor({ content, onChange }: NotebookEditorProps) {
  const debouncedOnChange = useDebouncedCallback(onChange, 400);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({
        placeholder:
          "Start typing your messy project notes, links, and rough bullets...",
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "font-editor text-[2rem] leading-[1.72] text-[#2f2d29] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      debouncedOnChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="journal-prose">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
