package io.mikhail.components;


import com.pulumi.core.Output;
import com.pulumi.resources.ResourceArgs;
import com.pulumi.core.annotations.Import;

public class StaticPageArgs extends ResourceArgs {
    @Import(name="indexContent", required=true)
    private Output<String> indexContent;

    public Output<String> indexContent() {
        return this.indexContent;
    }

    private StaticPageArgs() {}
    
    public StaticPageArgs(Output<String> indexContent) {
        this.indexContent = indexContent;
    }
} 