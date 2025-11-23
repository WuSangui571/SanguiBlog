
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.commonmark.Extension;
import org.commonmark.ext.gfm.tables.TablesExtension;
import org.commonmark.ext.gfm.strikethrough.StrikethroughExtension;
import org.commonmark.ext.autolink.AutolinkExtension;

import java.util.Arrays;
import java.util.List;

public class MarkdownTest {
    public static void main(String[] args) {
        String markdown = "Here is some `inline code` and a ~~strikethrough~~.";

        List<Extension> extensions = Arrays.asList(
                TablesExtension.create(),
                StrikethroughExtension.create(),
                AutolinkExtension.create());

        Parser parser = Parser.builder()
                .extensions(extensions)
                .build();
        HtmlRenderer renderer = HtmlRenderer.builder()
                .extensions(extensions)
                .build();

        String html = renderer.render(parser.parse(markdown));
        System.out.println("Markdown: " + markdown);
        System.out.println("HTML: " + html);
    }
}
