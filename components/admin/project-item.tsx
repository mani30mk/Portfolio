
import { memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Eye, EyeOff, GripVertical } from "lucide-react"

// Types need to be exported or redefined if not in a shared types file. 
// For now redefining simpler versions for props.

interface ProjectItemProps {
    repo: any
    settings: any
    index: number
    onToggleVisibility: (name: string) => void
    onUpdateDescription: (name: string, value: string) => void
    onUpdateImageURL: (name: string, value: string) => void
    onUpdateDisplayOrder: (name: string, value: number) => void
    onImageUpload: (name: string, file: File) => void
}

export const ProjectItem = memo(function ProjectItem({
    repo,
    settings,
    index,
    onToggleVisibility,
    onUpdateDescription,
    onUpdateImageURL,
    onUpdateDisplayOrder,
    onImageUpload,
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
})
