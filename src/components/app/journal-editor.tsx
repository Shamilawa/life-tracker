"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold01,
    Brush01,
    CodeSquare01,
    Code01,
    Dotpoints01,
    Dotpoints02,
    FlipBackward,
    FlipForward,
    ImagePlus,
    Italic01,
    Link01,
    Save01,
    Strikethrough01,
    Underline01,
} from "@untitledui/icons";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { saveDailyNote } from "@/lib/actions";
import { cx } from "@/utils/cx";

const CONTENT_CLASS = cx(
    "min-h-[340px] max-w-none text-sm text-primary outline-none",
    "[&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-primary",
    "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-primary",
    "[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-primary",
    "[&_p]:my-2 [&_p]:leading-relaxed [&_p]:text-secondary",
    "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_li]:text-secondary",
    "[&_a]:text-brand-secondary [&_a]:underline",
    "[&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
    "[&_pre]:my-3 [&_pre]:rounded-lg [&_pre]:bg-secondary [&_pre]:p-4 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0",
    "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-secondary [&_blockquote]:pl-4 [&_blockquote]:text-tertiary [&_blockquote]:italic",
    "[&_mark]:rounded [&_mark]:bg-warning-primary [&_mark]:px-0.5 [&_mark]:text-primary",
    "[&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-lg",
);

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function JournalEditor({ date, initialContent, editable }: { date: string; initialContent: unknown; editable: boolean }) {
    const [status, setStatus] = useState<SaveStatus>("idle");
    const [, force] = useReducer((x) => x + 1, 0);
    const fileRef = useRef<HTMLInputElement>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const editor = useEditor({
        editable,
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Underline,
            Highlight,
            Link.configure({ openOnClick: false, autolink: true }),
            Superscript,
            Subscript,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Image,
        ],
        content: (initialContent as never) ?? "",
        editorProps: { attributes: { class: CONTENT_CLASS } },
        onUpdate: () => {
            if (!editable) return;
            setStatus("idle");
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(persist, 1200);
        },
    });

    // Keep the toolbar's active states and the empty-overlay in sync with the selection.
    useEffect(() => {
        if (!editor) return;
        const update = () => force();
        editor.on("transaction", update);
        editor.on("selectionUpdate", update);
        return () => {
            editor.off("transaction", update);
            editor.off("selectionUpdate", update);
        };
    }, [editor]);

    useEffect(() => {
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
        };
    }, []);

    async function persist() {
        if (!editor) return;
        setStatus("saving");
        try {
            await saveDailyNote(date, editor.getJSON());
            setStatus("saved");
        } catch {
            setStatus("error");
        }
    }

    function saveNow() {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        persist();
    }

    function setLink() {
        if (!editor) return;
        const prev = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("Link URL", prev ?? "https://");
        if (url === null) return;
        if (url === "") return void editor.chain().focus().unsetLink().run();
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }

    function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !editor) return;
        const reader = new FileReader();
        reader.onload = () => editor.chain().focus().setImage({ src: reader.result as string }).run();
        reader.readAsDataURL(file);
        e.target.value = "";
    }

    if (!editor) return <div className="flex-1" />;

    const headingValue = editor.isActive("heading", { level: 1 })
        ? "1"
        : editor.isActive("heading", { level: 2 })
          ? "2"
          : editor.isActive("heading", { level: 3 })
            ? "3"
            : "0";

    const statusText = { idle: "", saving: "Saving…", saved: "Saved", error: "Save failed" }[status];

    return (
        <div className="flex h-full flex-col">
            {editable ? (
                <div className="scrollbar-hide flex shrink-0 items-center gap-1 overflow-x-auto border-b border-secondary bg-primary px-4 py-2">
                    <Btn label="Undo" icon={FlipBackward} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
                    <Btn label="Redo" icon={FlipForward} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
                    <Divider />

                    <select
                        value={headingValue}
                        aria-label="Text style"
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === "0") editor.chain().focus().setParagraph().run();
                            else editor.chain().focus().setHeading({ level: Number(v) as 1 | 2 | 3 }).run();
                        }}
                        className="h-8 shrink-0 rounded-md bg-primary px-2 text-sm font-medium text-secondary ring-1 ring-primary outline-none transition duration-100 hover:bg-primary_hover"
                    >
                        <option value="0">Normal</option>
                        <option value="1">Heading 1</option>
                        <option value="2">Heading 2</option>
                        <option value="3">Heading 3</option>
                    </select>
                    <Btn label="Bullet list" icon={Dotpoints01} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
                    <Btn label="Numbered list" icon={Dotpoints02} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
                    <Btn label="Code block" icon={CodeSquare01} active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
                    <Divider />

                    <Btn label="Bold" icon={Bold01} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
                    <Btn label="Italic" icon={Italic01} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
                    <Btn label="Strikethrough" icon={Strikethrough01} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
                    <Btn label="Inline code" icon={Code01} active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} />
                    <Btn label="Underline" icon={Underline01} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
                    <Btn label="Highlight" icon={Brush01} active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} />
                    <Btn label="Link" icon={Link01} active={editor.isActive("link")} onClick={setLink} />
                    <Btn label="Superscript" active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
                        <span className="text-sm font-semibold">x²</span>
                    </Btn>
                    <Btn label="Subscript" active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()}>
                        <span className="text-sm font-semibold">x₂</span>
                    </Btn>
                    <Divider />

                    <Btn label="Align left" icon={AlignLeft} active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} />
                    <Btn label="Align center" icon={AlignCenter} active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} />
                    <Btn label="Align right" icon={AlignRight} active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} />
                    <Btn label="Justify" icon={AlignJustify} active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} />
                    <Divider />

                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => fileRef.current?.click()}
                        className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-fg-quaternary transition duration-100 hover:bg-primary_hover hover:text-fg-secondary"
                    >
                        <ImagePlus className="size-4" />
                        Add
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />

                    <div className="ml-auto flex shrink-0 items-center gap-3">
                        {statusText && <span className={cx("text-xs", status === "error" ? "text-error-primary" : "text-tertiary")}>{statusText}</span>}
                        <button
                            type="button"
                            onClick={saveNow}
                            className="flex h-8 items-center gap-1.5 rounded-md bg-brand-solid px-3 text-sm font-semibold text-white transition duration-100 hover:bg-brand-solid_hover"
                        >
                            <Save01 className="size-4" />
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex shrink-0 items-center border-b border-secondary bg-primary px-6 py-3">
                    <span className="text-xs font-medium text-tertiary">Read only — you can only journal for today and past days.</span>
                </div>
            )}

            <div className="relative flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-8 py-10">
                    <EditorContent editor={editor} />
                </div>
                {editor.isEmpty && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                        <p className="text-2xl font-semibold text-quaternary">{editable ? "Anything Worth Remembering Today?" : "Nothing noted for this day"}</p>
                        {editable && <p className="mt-2 text-md text-quaternary">Small notes today become powerful reflections tomorrow.</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

function Btn({
    label,
    icon: Icon,
    active,
    disabled,
    onClick,
    children,
}: {
    label: string;
    icon?: React.FC<{ className?: string }>;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children?: React.ReactNode;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={cx(
                "flex size-8 shrink-0 items-center justify-center rounded-md text-fg-quaternary transition duration-100 hover:bg-primary_hover hover:text-fg-secondary disabled:cursor-not-allowed disabled:opacity-40",
                active && "bg-active text-fg-secondary",
            )}
        >
            {Icon ? <Icon className="size-4" /> : children}
        </button>
    );
}

function Divider() {
    return <span className="mx-1 h-5 w-px shrink-0 bg-border-secondary" />;
}
