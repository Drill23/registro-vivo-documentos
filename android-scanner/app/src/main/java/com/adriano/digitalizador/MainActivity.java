package com.adriano.digitalizador;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.view.*;
import android.widget.*;
import com.google.mlkit.vision.documentscanner.*;
import java.io.*;
import java.text.*;
import java.util.*;

public class MainActivity extends Activity {
    static final int SAVE = 3, SCAN = 4;
    final ArrayList<File> pages = new ArrayList<>();
    ImageView preview;
    TextView count, hint;
    RadioGroup filters;
    final int NAVY = Color.rgb(18, 42, 66);
    final int BLUE = Color.rgb(30, 103, 210);
    final int BG = Color.rgb(244, 247, 251);
    final int TEXT = Color.rgb(28, 39, 52);
    final int MUTED = Color.rgb(103, 116, 132);

    public void onCreate(Bundle b) {
        super.onCreate(b);
        buildUi();
        restore();
        refresh();
    }

    int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    GradientDrawable bg(int color, float radius) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp((int)radius));
        return g;
    }

    GradientDrawable strokeBg(int color, int strokeColor, int strokeWidth, float radius) {
        GradientDrawable g = bg(color, radius);
        g.setStroke(dp(strokeWidth), strokeColor);
        return g;
    }

    TextView text(String s, int sp, int color, boolean bold) {
        TextView v = new TextView(this);
        v.setText(s);
        v.setTextSize(sp);
        v.setTextColor(color);
        if (bold) v.setTypeface(null, Typeface.BOLD);
        return v;
    }

    Button button(String s, int background, int foreground) {
        Button b = new Button(this);
        b.setText(s);
        b.setTextSize(15);
        b.setTextColor(foreground);
        b.setAllCaps(false);
        b.setTypeface(null, Typeface.BOLD);
        b.setGravity(Gravity.CENTER);
        b.setMinHeight(0);
        b.setMinimumHeight(0);
        b.setPadding(dp(16), dp(14), dp(16), dp(14));
        b.setBackground(bg(background, 16));
        return b;
    }

    LinearLayout.LayoutParams lp(int w, int h, int mt) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(w, h);
        p.topMargin = dp(mt);
        return p;
    }

    public void buildUi() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(22), dp(20), dp(28));
        root.setBackgroundColor(BG);

        TextView eyebrow = text("SCANNER DE DOCUMENTOS", 12, BLUE, true);
        eyebrow.setLetterSpacing(.08f);
        root.addView(eyebrow);

        TextView title = text("Digitalizador PDF", 30, NAVY, true);
        root.addView(title, lp(-1, -2, 4));

        TextView subtitle = text("Recorte automático, perspectiva corrigida e máxima qualidade para cada página.", 15, MUTED, false);
        subtitle.setLineSpacing(0, 1.15f);
        root.addView(subtitle, lp(-1, -2, 6));

        LinearLayout quality = new LinearLayout(this);
        quality.setOrientation(LinearLayout.HORIZONTAL);
        quality.setGravity(Gravity.CENTER_VERTICAL);
        quality.setPadding(dp(12), dp(9), dp(12), dp(9));
        quality.setBackground(bg(Color.rgb(232, 245, 238), 14));
        TextView q = text("✓  Qualidade máxima ativada", 13, Color.rgb(38, 115, 73), true);
        quality.addView(q);
        root.addView(quality, lp(-1, -2, 16));

        LinearLayout previewCard = new LinearLayout(this);
        previewCard.setOrientation(LinearLayout.VERTICAL);
        previewCard.setPadding(dp(10), dp(10), dp(10), dp(12));
        previewCard.setBackground(strokeBg(Color.WHITE, Color.rgb(224, 230, 238), 1, 22));

        preview = new ImageView(this);
        preview.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        preview.setAdjustViewBounds(false);
        preview.setBackground(bg(Color.rgb(236, 241, 247), 16));
        previewCard.addView(preview, new LinearLayout.LayoutParams(-1, dp(390)));

        count = text("", 15, TEXT, true);
        count.setGravity(Gravity.CENTER);
        previewCard.addView(count, lp(-1, -2, 10));
        hint = text("", 12, MUTED, false);
        hint.setGravity(Gravity.CENTER);
        previewCard.addView(hint, lp(-1, -2, 2));
        root.addView(previewCard, lp(-1, -2, 18));

        Button scan = button("＋  Digitalizar documento", BLUE, Color.WHITE);
        root.addView(scan, lp(-1, -2, 16));

        Button importBtn = button("Importar imagem da galeria", Color.WHITE, NAVY);
        importBtn.setBackground(strokeBg(Color.WHITE, Color.rgb(211, 220, 231), 1, 16));
        root.addView(importBtn, lp(-1, -2, 10));

        TextView modeTitle = text("Aparência do PDF", 14, TEXT, true);
        root.addView(modeTitle, lp(-1, -2, 22));
        TextView modeDesc = text("A opção Cor preserva a imagem original sem escurecimento adicional.", 12, MUTED, false);
        root.addView(modeDesc, lp(-1, -2, 3));

        filters = new RadioGroup(this);
        filters.setOrientation(RadioGroup.HORIZONTAL);
        filters.setGravity(Gravity.CENTER);
        String[] names = {"Cor", "Cinza", "P/B"};
        for (int i = 0; i < 3; i++) {
            RadioButton r = new RadioButton(this);
            r.setText(names[i]);
            r.setTextColor(TEXT);
            r.setTextSize(14);
            r.setGravity(Gravity.CENTER);
            r.setId(100 + i);
            r.setButtonTintList(android.content.res.ColorStateList.valueOf(BLUE));
            RadioGroup.LayoutParams rp = new RadioGroup.LayoutParams(0, dp(50), 1);
            if (i > 0) rp.leftMargin = dp(6);
            filters.addView(r, rp);
        }
        filters.check(100);
        root.addView(filters, lp(-1, dp(50), 8));

        LinearLayout editRow = new LinearLayout(this);
        editRow.setOrientation(LinearLayout.HORIZONTAL);
        Button rotate = button("↻  Girar", Color.WHITE, NAVY);
        Button remove = button("Remover", Color.WHITE, Color.rgb(170, 55, 55));
        rotate.setBackground(strokeBg(Color.WHITE, Color.rgb(211, 220, 231), 1, 14));
        remove.setBackground(strokeBg(Color.WHITE, Color.rgb(235, 207, 207), 1, 14));
        LinearLayout.LayoutParams ep = new LinearLayout.LayoutParams(0, dp(50), 1);
        editRow.addView(rotate, ep);
        LinearLayout.LayoutParams ep2 = new LinearLayout.LayoutParams(0, dp(50), 1);
        ep2.leftMargin = dp(8);
        editRow.addView(remove, ep2);
        root.addView(editRow, lp(-1, dp(50), 16));

        Button save = button("Salvar PDF em alta qualidade", NAVY, Color.WHITE);
        root.addView(save, lp(-1, -2, 18));

        Button clear = button("Limpar documento", Color.TRANSPARENT, MUTED);
        clear.setBackgroundColor(Color.TRANSPARENT);
        root.addView(clear, lp(-1, -2, 5));

        TextView privacy = text("As páginas permanecem no aparelho. O app não envia seus documentos para um servidor próprio.", 11, MUTED, false);
        privacy.setGravity(Gravity.CENTER);
        privacy.setLineSpacing(0, 1.15f);
        root.addView(privacy, lp(-1, -2, 12));

        scroll.addView(root);
        setContentView(scroll);

        scan.setOnClickListener(v -> scanner());
        importBtn.setOnClickListener(v -> scanner());
        rotate.setOnClickListener(v -> rotate());
        remove.setOnClickListener(v -> remove());
        clear.setOnClickListener(v -> clearAll());
        save.setOnClickListener(v -> savePicker());
    }

    File dir() {
        File d = new File(getFilesDir(), "scans");
        d.mkdirs();
        return d;
    }

    String stamp() { return new SimpleDateFormat("yyyyMMdd_HHmmss_SSS", Locale.US).format(new Date()); }

    void restore() {
        File[] a = dir().listFiles((d, n) -> n.startsWith("page_") && n.endsWith(".jpg"));
        if (a != null) {
            Arrays.sort(a, Comparator.comparing(File::getName));
            pages.addAll(Arrays.asList(a));
        }
    }

    void scanner() {
        GmsDocumentScannerOptions o = new GmsDocumentScannerOptions.Builder()
                .setGalleryImportAllowed(true)
                .setPageLimit(50)
                .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
                .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_BASE)
                .build();
        GmsDocumentScanner s = GmsDocumentScanning.getClient(o);
        s.getStartScanIntent(this)
                .addOnSuccessListener(x -> {
                    try { startIntentSenderForResult(x, SCAN, null, 0, 0, 0); }
                    catch (IntentSender.SendIntentException e) { toast("Não foi possível abrir o scanner."); }
                })
                .addOnFailureListener(e -> toast("Scanner indisponível: " + e.getMessage()));
    }

    protected void onActivityResult(int r, int c, Intent data) {
        super.onActivityResult(r, c, data);
        if (c != RESULT_OK) return;
        if (r == SCAN && data != null) {
            GmsDocumentScanningResult z = GmsDocumentScanningResult.fromActivityResultIntent(data);
            if (z != null && z.getPages() != null) {
                int n = 0;
                for (GmsDocumentScanningResult.Page p : z.getPages()) {
                    File f = importPageLossless(p.getImageUri());
                    if (f != null) { pages.add(f); n++; }
                }
                if (n > 0) toast(n == 1 ? "Página recortada em alta qualidade." : n + " páginas recortadas em alta qualidade.");
            }
            refresh();
        } else if (r == SAVE && data != null) makePdf(data.getData());
    }

    File importPageLossless(Uri u) {
        File f = new File(dir(), "page_" + stamp() + ".jpg");
        try (InputStream in = getContentResolver().openInputStream(u); FileOutputStream out = new FileOutputStream(f)) {
            if (in == null) return null;
            byte[] buffer = new byte[65536];
            int n;
            while ((n = in.read(buffer)) > 0) out.write(buffer, 0, n);
            out.flush();
            return f.length() > 0 ? f : null;
        } catch (Exception e) {
            f.delete();
            toast("Falha ao importar a página digitalizada.");
            return null;
        }
    }

    Bitmap decodePreview(File f) {
        BitmapFactory.Options b = new BitmapFactory.Options();
        b.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(f.getPath(), b);
        int sample = 1;
        while (b.outWidth / sample > 1600 || b.outHeight / sample > 1600) sample *= 2;
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inSampleSize = sample;
        o.inPreferredConfig = Bitmap.Config.ARGB_8888;
        return BitmapFactory.decodeFile(f.getPath(), o);
    }

    void refresh() {
        if (pages.isEmpty()) {
            preview.setImageDrawable(null);
            count.setText("Nenhuma página adicionada");
            hint.setText("Toque em “Digitalizar documento” para começar");
        } else {
            count.setText(pages.size() + (pages.size() == 1 ? " página pronta" : " páginas prontas"));
            hint.setText("Prévia otimizada — o arquivo original continua em resolução máxima");
            preview.setImageBitmap(decodePreview(pages.get(pages.size() - 1)));
        }
    }

    void rotate() {
        if (pages.isEmpty()) return;
        File f = pages.get(pages.size() - 1);
        Bitmap b = BitmapFactory.decodeFile(f.getPath());
        if (b == null) return;
        Matrix m = new Matrix();
        m.postRotate(90);
        Bitmap n = Bitmap.createBitmap(b, 0, 0, b.getWidth(), b.getHeight(), m, true);
        try (FileOutputStream o = new FileOutputStream(f, false)) { n.compress(Bitmap.CompressFormat.JPEG, 100, o); }
        catch (Exception ignored) {}
        if (b != n) b.recycle();
        n.recycle();
        refresh();
    }

    void remove() {
        if (pages.isEmpty()) return;
        pages.remove(pages.size() - 1).delete();
        refresh();
    }

    void clearAll() {
        for (File f : pages) f.delete();
        pages.clear();
        refresh();
    }

    void savePicker() {
        if (pages.isEmpty()) { toast("Adicione pelo menos uma página."); return; }
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("application/pdf");
        i.putExtra(Intent.EXTRA_TITLE, "Documento_" + new SimpleDateFormat("yyyy-MM-dd_HH-mm", Locale.getDefault()).format(new Date()) + ".pdf");
        startActivityForResult(i, SAVE);
    }

    Bitmap filter(Bitmap s) {
        int id = filters.getCheckedRadioButtonId();
        if (id == 100) return s;
        Bitmap o = Bitmap.createBitmap(s.getWidth(), s.getHeight(), Bitmap.Config.ARGB_8888);
        int width = s.getWidth(), height = s.getHeight();
        int[] row = new int[width];
        for (int y = 0; y < height; y++) {
            s.getPixels(row, 0, width, 0, y, width, 1);
            for (int x = 0; x < width; x++) {
                int c = row[x];
                int g = Math.round(Color.red(c) * .299f + Color.green(c) * .587f + Color.blue(c) * .114f);
                if (id == 102) g = g > 170 ? 255 : 0;
                row[x] = Color.rgb(g, g, g);
            }
            o.setPixels(row, 0, width, 0, y, width, 1);
        }
        return o;
    }

    void makePdf(Uri u) {
        PdfDocument d = new PdfDocument();
        try {
            int pageNo = 1;
            for (File f : pages) {
                Bitmap original = BitmapFactory.decodeFile(f.getPath());
                if (original == null) continue;
                Bitmap image = filter(original);
                boolean portrait = image.getHeight() >= image.getWidth();
                int pageW = portrait ? 2480 : 3508;
                int pageH = portrait ? 3508 : 2480;
                PdfDocument.Page page = d.startPage(new PdfDocument.PageInfo.Builder(pageW, pageH, pageNo++).create());
                Canvas canvas = page.getCanvas();
                canvas.drawColor(Color.WHITE);
                float margin = 36f;
                float scale = Math.min((pageW - margin * 2f) / image.getWidth(), (pageH - margin * 2f) / image.getHeight());
                float w = image.getWidth() * scale;
                float h = image.getHeight() * scale;
                RectF dst = new RectF((pageW - w) / 2f, (pageH - h) / 2f, (pageW + w) / 2f, (pageH + h) / 2f);
                Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG | Paint.DITHER_FLAG);
                canvas.drawBitmap(image, null, dst, paint);
                d.finishPage(page);
                if (image != original) image.recycle();
                original.recycle();
            }
            try (OutputStream out = getContentResolver().openOutputStream(u)) {
                if (out == null) throw new IOException("Destino inválido");
                d.writeTo(out);
            }
            toast("PDF salvo em alta qualidade.");
        } catch (Exception e) {
            toast("Erro ao gerar PDF: " + e.getMessage());
        } finally {
            d.close();
        }
    }

    void toast(String s) { Toast.makeText(this, s, Toast.LENGTH_LONG).show(); }
}
