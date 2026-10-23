from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

out_dir = Path("../frontend/public/mascot")
out_dir.mkdir(parents=True, exist_ok=True)

size = (256, 256)

poses = {
    "wave": ("#0284c7", "#38bdf8", "👋"),
    "thinking": ("#6366f1", "#a855f7", "💭"),
    "pointing": ("#ea580c", "#f59e0b", "👉")
}

for name, (col1, col2, symbol) in poses.items():
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Outer circle / glow
    draw.ellipse([8, 8, 248, 248], fill=col1, outline=col2, width=6)
    
    # Inner circular badge
    draw.ellipse([24, 24, 232, 232], fill="#0f172a")
    
    # Mascot character (friendly cute bot / guide circle)
    # Head/Face
    draw.ellipse([64, 60, 192, 188], fill="#38bdf8")
    
    # Eyes
    if name == "thinking":
        draw.ellipse([92, 100, 112, 120], fill="#0f172a")
        draw.ellipse([144, 95, 164, 115], fill="#0f172a")
    else:
        draw.ellipse([92, 105, 112, 125], fill="#0f172a")
        draw.ellipse([144, 105, 164, 125], fill="#0f172a")
        
    # Eye highlights
    draw.ellipse([96, 108, 104, 116], fill="#ffffff")
    draw.ellipse([148, 108, 156, 116], fill="#ffffff")
    
    # Smile
    draw.arc([105, 120, 151, 150], start=10, end=170, fill="#0f172a", width=5)
    
    # Solvane Antenna
    draw.line([128, 60, 128, 38], fill=col2, width=5)
    draw.ellipse([121, 30, 135, 44], fill=col2)
    
    # Badge letter 'S'
    draw.ellipse([175, 175, 235, 235], fill=col1, outline="#ffffff", width=3)
    
    out_file = out_dir / f"{name}.png"
    img.save(out_file, "PNG")
    print(f"Generated mascot: {out_file}")
