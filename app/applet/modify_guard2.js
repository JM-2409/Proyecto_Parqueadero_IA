const fs = require('fs');
let content = fs.readFileSync('components/GuardDashboard.tsx', 'utf8');

const target1 = `  const handlePrintReceipt = () => {
    window.print();
  };`;

const replacement1 = `  const handlePrintReceipt = () => {
    const receiptElement = document.getElementById("receipt-content");
    if (!receiptElement) return;

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    const styles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]'),
    )
      .map((el) => el.outerHTML)
      .join("\\n");

    iframeDoc.write(\`
      <html>
        <head>
          <title>Recibo</title>
          \${styles}
          <style>
            @page { size: auto; margin: 0mm; }
            body { margin: 0; padding: 20px; background: white; }
            #receipt-content { transform: none !important; margin: 0 auto; box-shadow: none !important; border: none !important; }
          </style>
        </head>
        <body>
          \${receiptElement.outerHTML}
        </body>
      </html>
    \`);
    iframeDoc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };`;

content = content.replace(target1, replacement1);

const target2 = `                  <div className="flex gap-2">
                    <div className="flex w-full gap-2">
                      <input
                        type="text"
                        value={whatsappCountryCode}
                        onChange={(e) => setWhatsappCountryCode(e.target.value)}
                        className="w-16 px-2 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-center"
                        placeholder="+57"
                      />
                      <input
                        type="tel"
                        placeholder="Número"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <button
                      onClick={handleWhatsAppShare}
                      disabled={!whatsappNumber || isSharing}
                      className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSharing ? "Preparando..." : "Enviar"}
                    </button>
                  </div>`;

const replacement2 = `                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={whatsappCountryCode}
                      onChange={(e) => setWhatsappCountryCode(e.target.value)}
                      className="w-14 sm:w-16 px-1 sm:px-2 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-center shrink-0"
                      placeholder="+57"
                    />
                    <input
                      type="tel"
                      placeholder="Número"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="flex-1 min-w-0 px-2 sm:px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button
                      onClick={handleWhatsAppShare}
                      disabled={!whatsappNumber || isSharing}
                      className="px-3 sm:px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0 whitespace-nowrap"
                    >
                      {isSharing ? "..." : "Enviar"}
                    </button>
                  </div>`;

content = content.replace(target2, replacement2);

fs.writeFileSync('components/GuardDashboard.tsx', content);
