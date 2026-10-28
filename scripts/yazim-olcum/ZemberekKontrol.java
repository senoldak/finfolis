// Tek seferlik yazım ölçümü (olc.py): sözcük listesini Zemberek'in TurkishSpellChecker'ıyla denetler.
// Kullanım: java ZemberekKontrol <sözcükler.txt> <çıktı.tsv>  (çıktı: yanlış sözcük \t en çok 3 öneri)
import java.io.BufferedWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import zemberek.morphology.TurkishMorphology;
import zemberek.normalization.TurkishSpellChecker;

public class ZemberekKontrol {
  public static void main(String[] args) throws Exception {
    TurkishMorphology morfoloji = TurkishMorphology.createWithDefaults();
    TurkishSpellChecker denetci = new TurkishSpellChecker(morfoloji);
    List<String> sozcukler = Files.readAllLines(Paths.get(args[0]), StandardCharsets.UTF_8);
    try (BufferedWriter out = Files.newBufferedWriter(Paths.get(args[1]), StandardCharsets.UTF_8)) {
      for (String w : sozcukler) {
        if (w.isEmpty() || denetci.check(w)) continue;
        List<String> oneriler = denetci.suggestForWord(w);
        out.write(w + "\t" + String.join(",", oneriler.subList(0, Math.min(3, oneriler.size()))) + "\n");
      }
    }
  }
}
