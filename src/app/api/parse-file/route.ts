import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';

// 10MB 限制 (Next.js 默认由 bodySizeLimit 配置，这里我们逻辑上也判断一下)
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: '文件大小不能超过 10MB' }, { status: 400 });
        }

        // 将 File 对象转为 Node.js Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let parsedText = '';

        // 根据文件类型解析
        if (file.type === 'application/pdf') {
            const parser = new PDFParser(null, 1); // 1 代表提取纯文本 (raw text content)

            parsedText = await new Promise((resolve, reject) => {
                // 监听错误
                parser.on("pdfParser_dataError", (errData: any) => {
                    console.error(errData.parserError);
                    reject(new Error("PDF 解析错误"));
                });

                // 监听完成
                parser.on("pdfParser_dataReady", () => {
                    const rawText = parser.getRawTextContent();

                    try {
                        // 尝试解码 (比如把 %20 变成空格)
                        resolve(decodeURIComponent(rawText));
                    } catch (e) {
                        // 【核心修复】如果报错 (比如 PDF 里有 "50%" 这种文字)，就直接用原始文本
                        // 这样就不会崩了
                        console.warn("PDF decode warning: keeping raw text");
                        resolve(rawText);
                    }
                });

                // 开始解析 Buffer
                parser.parseBuffer(buffer);
            });
        }
        else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer });
            parsedText = result.value;
        }
        else if (file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.md')) {
            parsedText = buffer.toString('utf-8');
        }
        else {
            return NextResponse.json({ error: '不支持的文件格式' }, { status: 400 });
        }

        parsedText = parsedText
            .replace(/----------------/g, '\n')
            .replace(/\n\s*\n/g, '\n')
            .trim();

        // 如果解析出来是空的
        if (!parsedText || parsedText.length < 10) {
            return NextResponse.json({ error: '解析成功，但文件内容似乎为空或全是图片' }, { status: 400 });
        }

        return NextResponse.json({ text: parsedText });

    } catch (error) {
        console.error('File parsing error:', error);
        return NextResponse.json({ error: '文件解析失败' }, { status: 500 });
    }
}