import { useState } from 'react';
import { Download, Image as ImageIcon, FileImage, ExternalLink, Package } from 'lucide-react';
import { useStore } from '../../store';
import JSZip from 'jszip';

export const AssetsPanel = () => {
  const { data } = useStore();
  const [downloading, setDownloading] = useState(false);

  const assets = data.assets || [];
  const images = assets.filter(a => a.type === 'image' || a.type === 'background');
  const svgs = assets.filter(a => a.type === 'svg');

  const handleDownload = async (url: string, filename: string) => {
      try {
          const response = await fetch(url);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
      } catch (e) {
          console.error('Download failed', e);
          // Fallback to open in new tab
          window.open(url, '_blank');
      }
  };

  const handleDownloadAll = async () => {
      setDownloading(true);
      const zip = new JSZip();
      
      const folder = zip.folder("assets");
      const promises = assets.slice(0, 50).map(async (asset, i) => { // Limit to 50 to avoid freezing
          try {
             // For data URIs (SVGs)
             if (asset.url.startsWith('data:')) {
                 const base64 = asset.url.split(',')[1];
                 folder?.file(`asset_${i}.svg`, base64, { base64: true });
                 return;
             }

             // For remote URLs
             const response = await fetch(asset.url);
             const blob = await response.blob();
             // Try to guess extension
             const mime = blob.type;
             let ext = 'png';
             if (mime.includes('jpeg')) ext = 'jpg';
             if (mime.includes('svg')) ext = 'svg';
             if (mime.includes('webp')) ext = 'webp';
             
             folder?.file(`asset_${i}.${ext}`, blob);
          } catch (e) {
              console.warn('Failed to zip asset', asset.url);
          }
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = "website-assets.zip";
      document.body.appendChild(a);
      a.click();
      setDownloading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-2xl font-black tracking-tight">Assets</h2>
            <p className="text-sm text-muted-foreground">{assets.length} items found</p>
         </div>
         {assets.length > 0 && (
            <button 
                onClick={handleDownloadAll}
                disabled={downloading}
                className="bg-primary text-primary-foreground text-sm font-bold px-4 py-2 rounded-xl shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
                {downloading ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <Package className="w-4 h-4" />}
                Download All ({assets.slice(0,50).length})
            </button>
         )}
      </div>

      {assets.length === 0 ? (
           <div className="text-center py-12 text-muted-foreground">
               <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
               <p>No accessible assets found.</p>
           </div>
      ) : (
          <div className="space-y-8">
              {/* Images Grid */}
              {images.length > 0 && (
                  <div>
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-blue-500" /> Images
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                          {images.map((img, i) => (
                              <div key={i} className="group relative bg-card rounded-xl border border-border overflow-hidden aspect-square flex items-center justify-center p-2">
                                  {/* Transparency Grid Config */}
                                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                                  
                                  <img src={img.url} className="max-w-full max-h-full object-contain relative z-10" alt="" />
                                  
                                  {/* Overlay */}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20 backdrop-blur-sm">
                                      <button 
                                          onClick={() => handleDownload(img.url, `image_${i}`)}
                                          className="bg-white text-black p-2 rounded-lg hover:scale-110 transition-transform" 
                                          title="Download"
                                      >
                                          <Download className="w-5 h-5" />
                                      </button>
                                      <a 
                                          href={img.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="bg-white text-black p-2 rounded-lg hover:scale-110 transition-transform"
                                          title="Open original"
                                      >
                                          <ExternalLink className="w-5 h-5" />
                                      </a>
                                  </div>
                                  
                                  {/* Dimensions Badge */}
                                  {img.dimensions && (
                                     <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                         {img.dimensions}
                                     </span>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* SVGs Grid */}
              {svgs.length > 0 && (
                  <div>
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                          <FileImage className="w-5 h-5 text-orange-500" /> Vectors (SVG)
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                          {svgs.map((svg, i) => (
                              <div key={i} className="group relative bg-card rounded-xl border border-border overflow-hidden aspect-square flex items-center justify-center p-4">
                                  <img src={svg.url} className="w-full h-full object-contain" alt="" />
                                  <button 
                                      onClick={() => handleDownload(svg.url, `vector_${i}.svg`)}
                                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold"
                                  >
                                      <Download className="w-6 h-6" />
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
