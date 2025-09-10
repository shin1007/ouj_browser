const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// SVGファイルをPNGに変換するスクリプト
const svgPath = path.join(__dirname, 'src', 'icons', 'ouj.svg');
const outputDir = path.join(__dirname, 'src', 'icons');

// 必要なサイズ
const sizes = [16, 48, 128];

console.log('SVGファイルをPNGに変換中...');

// SVGファイルの存在確認
if (!fs.existsSync(svgPath)) {
  console.error('SVGファイルが見つかりません:', svgPath);
  process.exit(1);
}

async function convertSvgToPng() {
  try {
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `ouj${size}.png`);
      
      console.log(`${size}x${size} サイズのPNGファイルを作成中: ${outputPath}`);
      
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ ${size}x${size} サイズのPNGファイルを作成しました`);
    }
    
    console.log('\n🎉 すべてのPNGファイルの変換が完了しました！');
    
    // manifest.jsonの更新
    updateManifest();
    
  } catch (error) {
    console.error('変換中にエラーが発生しました:', error);
  }
}

function updateManifest() {
  const manifestPath = path.join(__dirname, 'src', 'manifest.json');
  
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // アイコンのパスを更新
      manifest.icons = {
        "16": "icons/ouj16.png",
        "48": "icons/ouj48.png",
        "128": "icons/ouj128.png"
      };
      
      // manifest.jsonを保存
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('✓ manifest.jsonのアイコンパスを更新しました');
      
    } catch (error) {
      console.error('manifest.jsonの更新中にエラーが発生しました:', error);
    }
  }
}

// 変換を実行
convertSvgToPng(); 