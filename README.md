# 斜めのメルカトル図法、斜めルカトル図法

これは [十人十色アドベントカレンダー 2024](https://adventar.org/calendars/10449) の25日目のコンテンツです。最終日ということで気合を入れて書きましたが、「文章」ではなくて「プログラム」(Web アプリ) です。

何を書こうかと考えていた時に、唐突にこのフレーズが思い浮かんできてしまったので、仕方なく勢いで実装してしまいました。

[斜めのメルカトル図法、斜めルカトル図法](https://unsigned-wrong-wrong-int.github.io/mercatoblique/)

鼻で笑って楽しんでいただけますと幸いです。

寒さも厳しくなってまいりましたが、体調にお気をつけて、よいお年をお迎えください。

2024/12/25  
眠すぎてネムノキ (Twitter: [@nemuiyonemunoki](https://x.com/nemuiyonemunoki))

---

## 概要
斜軸メルカトル図法の世界地図を白地図として描画します。

地図の中心となる点の座標と、円筒の傾きをUIで自由に調整できます。

地球楕円体面上の座標のデータを球面に等角写像で投影した後、3次元空間で適当な回転を行い、最後にメルカトル図法の要領で2次元の地図にします。

## 地図データ
データは [Natural Earth](https://www.naturalearthdata.com/) より、パブリックドメインとして公開されているものをダウンロードして利用しています。

[Terms of Use - Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/)

ベクター形式のShapefileフォーマットのファイルを読み込んで描画します。

[ESRI Shapefile Technical Description](https://www.esri.com/content/dam/esrisites/sitecore-archive/Files/Pdfs/library/whitepapers/pdfs/shapefile.pdf)

## 使用ライブラリ等
特にありません。

座標の変換はすべて自前でJavaScriptで計算しています。また、描画には標準のCanvas APIを利用しています。

## ライセンス
このリポジトリ自体もCC0で公開しています。ご自由にお使いください。
