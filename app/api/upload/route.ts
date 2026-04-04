import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

// SDK auto-reads CLOUDINARY_URL env var — no hardcoded credentials
cloudinary.config({ secure: true })

// POST /api/upload — upload image to Cloudinary, return { url }
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as Blob | null
    if (!file) return NextResponse.json({ error: "no file" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "trendzap/markets", resource_type: "image" }, (err, res) => {
          if (err || !res) reject(err)
          else resolve(res as { secure_url: string })
        })
        .end(buffer)
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
