
import { memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Eye, EyeOff, GripVertical, ExternalLink, Code2 } from "lucide-react"

// Types need to be exported or redefined if not in a shared types file. 
// For now redefining simpler versions for props.

interface ProjectItemProps {
    repo: any
    settings: any
    index: number
    onToggleVisibility: (name: string) => void
    onUpdateDescription: (name: string, value: string) => void
    onUpdateImageURL: (name: string, value: string) => void
    onUpdateVideoURL: (name: string, value: string) => void
    onUpdateLiveURL?: (name: string, value: string) => void
    onUpdateDisplayOrder: (name: string, value: number) => void
    onImageUpload: (name: string, file: File) => void
    onUpdateFlowchartData?: (name: string, value: string) => void
}

export const ProjectItem = memo(function ProjectItem({
    repo,
    settings,
    index,
    onToggleVisibility,
    onUpdateDescription,
    onUpdateImageURL,
    onUpdateVideoURL,
    onUpdateLiveURL,
    onUpdateDisplayOrder,
    onImageUpload,
    onUpdateFlowchartData,
}: ProjectItemProps) {
    return (
        <div
            className={`border p-4 ${settings?.is_visible
                    ? "border-foreground bg-muted"
                    : "border-border bg-background"
                }`}
        >
            <div className="flex items-start gap-4">
                <div className="flex items-center gap-2 pt-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Switch
                        checked={settings?.is_visible || false}
                        onCheckedChange={() => onToggleVisibility(repo.name)}
                    />
                </div>

                <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2">
                        {settings?.is_visible ? (
                            <Eye className="h-4 w-4 text-foreground" />
                        ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <h3 className="font-mono text-sm font-bold">{repo.name}</h3>
                        {repo.language && (
                            <span className="font-mono text-xs text-muted-foreground border border-border px-2 py-0.5">
                                {repo.language}
                            </span>
                        )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {repo.description || "No description"}
                    </p>

                    {settings?.is_visible && (
                        <div className="space-y-4 pt-4 border-t border-border mt-4">
                            <div className="grid gap-2">
                                <label className="font-mono text-xs uppercase text-muted-foreground">
                                    Custom Description (optional)
                                </label>
                                <Input
                                    value={settings?.custom_description || ""}
                                    onChange={(e) =>
                                        onUpdateDescription(repo.name, e.target.value)
                                    }
                                    placeholder="Override the GitHub description..."
                                    className="font-mono text-sm"
                                />
                            </div>

                            <div className="grid gap-2">
                                <label className="font-mono text-xs uppercase text-muted-foreground">
                                    Project Image (Upload or URL)
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) onImageUpload(repo.name, file)
                                        }}
                                        className="font-mono text-sm file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-foreground file:text-background hover:file:bg-foreground/90 cursor-pointer"
                                    />
                                </div>
                                <Input
                                    value={settings?.image_url ?? ""}
                                    onChange={(e) => onUpdateImageURL(repo.name, e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="font-mono text-sm mt-1"
                                />
                                {settings?.image_url && (
                                    <div className="relative w-full h-32 bg-muted mt-2 rounded-md overflow-hidden border border-border">
                                        <img
                                            src={settings.image_url}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <label className="font-mono text-xs uppercase text-muted-foreground">
                                    Demo Video URL (optional)
                                </label>
                                <Input
                                    value={settings?.video_url ?? ""}
                                    onChange={(e) => onUpdateVideoURL(repo.name, e.target.value)}
                                    placeholder="https://res.cloudinary.com/... or any video URL"
                                    className="font-mono text-sm"
                                />
                                {settings?.video_url && (
                                    <p className="font-mono text-xs text-muted-foreground">
                                        ✅ Video URL set
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <label className="font-mono text-xs uppercase text-muted-foreground flex items-center justify-between">
                                    <span>Live Deployed URL (optional)</span>
                                    {settings?.live_url && (
                                        <a
                                            href={settings.live_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-foreground underline hover:text-foreground/80 flex items-center gap-1"
                                        >
                                            Visit <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                    )}
                                </label>
                                <Input
                                    value={settings?.live_url ?? ""}
                                    onChange={(e) => onUpdateLiveURL?.(repo.name, e.target.value)}
                                    placeholder="https://yourproject.vercel.app"
                                    className="font-mono text-sm"
                                />
                                {settings?.live_url && (
                                    <p className="font-mono text-xs text-muted-foreground">
                                        ✅ Live URL set: {settings.live_url}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="font-mono text-xs uppercase text-muted-foreground">
                                    Display Order:
                                </label>
                                <Input
                                    type="number"
                                    value={settings?.display_order || index}
                                    onChange={(e) =>
                                        onUpdateDisplayOrder(repo.name, parseInt(e.target.value) || 0)
                                    }
                                    className="font-mono text-sm w-20"
                                    min={0}
                                />
                            </div>

                            {onUpdateFlowchartData && (
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="font-mono text-xs uppercase text-muted-foreground flex items-center gap-2">
                                            <Code2 className="h-3.5 w-3.5" />
                                            Flowchart Data (JSON)
                                        </label>
                                        <div className="flex items-center gap-2">
                                            {settings?.flowchart_data && (
                                                <span className={`font-mono text-xs px-2 py-0.5 ${
                                                    (() => {
                                                        try {
                                                            const parsed = JSON.parse(settings.flowchart_data);
                                                            const count = Array.isArray(parsed) ? parsed.length : 1;
                                                            return "text-green-600 border border-green-600/30";
                                                        } catch {
                                                            return "text-red-500 border border-red-500/30";
                                                        }
                                                    })()
                                                }`}>
                                                    {(() => {
                                                        try {
                                                            const parsed = JSON.parse(settings.flowchart_data);
                                                            const count = Array.isArray(parsed) ? parsed.length : 1;
                                                            return `✅ Valid JSON (${count} diagram${count > 1 ? "s" : ""})`;
                                                        } catch {
                                                            return "❌ Invalid JSON";
                                                        }
                                                    })()}
                                                </span>
                                            )}
                                            {settings?.flowchart_data && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 text-[10px] font-mono px-2"
                                                    onClick={() => {
                                                        try {
                                                            const parsed = JSON.parse(settings.flowchart_data);
                                                            onUpdateFlowchartData(repo.name, JSON.stringify(parsed, null, 2));
                                                        } catch {
                                                            alert("Invalid JSON cannot be formatted");
                                                        }
                                                    }}
                                                >
                                                    Prettify
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Multi-chart summary if multiple charts */}
                                    {(() => {
                                        if (!settings?.flowchart_data) return null;
                                        try {
                                            const parsed = JSON.parse(settings.flowchart_data);
                                            if (Array.isArray(parsed) && parsed.length > 1) {
                                                return (
                                                    <div className="bg-background/80 border border-foreground/20 p-2 text-[11px] font-mono space-y-1">
                                                        <span className="text-muted-foreground uppercase text-[9px] tracking-wider block">
                                                            Detected {parsed.length} diagrams (Tab Switcher will be enabled on flowchart page):
                                                        </span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {parsed.map((fc: any, i: number) => (
                                                                <span key={i} className="border border-border px-1.5 py-0.5 bg-muted">
                                                                    Tab {i + 1}: <strong>{fc.title || `Diagram ${i + 1}`}</strong> ({fc.nodes?.length || 0} nodes)
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        } catch {}
                                        return null;
                                    })()}

                                    <textarea
                                        value={settings?.flowchart_data ?? ""}
                                        onChange={(e) =>
                                            onUpdateFlowchartData(repo.name, e.target.value)
                                        }
                                        placeholder='[{"title":"Architecture","nodes":[...],"edges":[...]}]'
                                        className="font-mono text-xs w-full min-h-[140px] p-3 border border-border bg-background resize-y focus:outline-none focus:border-foreground transition-colors"
                                        spellCheck={false}
                                    />
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <p className="font-mono text-[10px]">
                                            Array format: <code>[{`{"title":"Flow 1", ...}`}, {`{"title":"Flow 2", ...}`}]</code>
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const sampleMulti = [
                                                    {
                                                        title: "System Architecture",
                                                        nodes: [
                                                            { id: "user", label: "User Browser", type: "actor", description: "Uploads docs and submits queries" },
                                                            { id: "backend", label: "Backend Server", type: "service", description: "Next.js / FastAPI API layer", tech: ["FastAPI", "Python"] },
                                                            { id: "chunker", label: "Text Chunker", type: "process", description: "Splits documents into overlapping chunks", tech: ["LangChain"] },
                                                            { id: "embedding", label: "Embedding Service", type: "process", description: "Generates vector embeddings", tech: ["Gemini Embedding API"] },
                                                            { id: "database", label: "Supabase pgvector", type: "database", description: "Stores vector embeddings and chunks", tech: ["PostgreSQL", "pgvector"] }
                                                        ],
                                                        edges: [
                                                            { from: "user", to: "backend", label: "Upload Document" },
                                                            { from: "backend", to: "chunker", label: "Extract & Split" },
                                                            { from: "chunker", to: "embedding", label: "Batched Chunks" },
                                                            { from: "embedding", to: "backend", label: "Generated Vectors" },
                                                            { from: "backend", to: "database", label: "Store Vectors" }
                                                        ]
                                                    },
                                                    {
                                                        title: "Query & Retrieval Pipeline",
                                                        nodes: [
                                                            { id: "query_user", label: "User Query", type: "actor", description: "Search query or chat prompt" },
                                                            { id: "query_api", label: "Search Gateway", type: "service", description: "Generates query embedding" },
                                                            { id: "vector_db", label: "Supabase pgvector", type: "database", description: "Cosine similarity search", tech: ["pgvector"] },
                                                            { id: "llm", label: "Gemini 1.5 Flash", type: "external", description: "RAG augmented response generation", tech: ["Gemini 1.5"] }
                                                        ],
                                                        edges: [
                                                            { from: "query_user", to: "query_api", label: "Submit Query" },
                                                            { from: "query_api", to: "vector_db", label: "Vector Search" },
                                                            { from: "vector_db", to: "llm", label: "Top-K Context" },
                                                            { from: "llm", to: "query_user", label: "Synthesized Answer" }
                                                        ]
                                                    }
                                                ];
                                                onUpdateFlowchartData(repo.name, JSON.stringify(sampleMulti, null, 2));
                                            }}
                                            className="font-mono text-[10px] underline hover:text-foreground transition-colors"
                                        >
                                            Load Sample 2-Chart Template
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
})
