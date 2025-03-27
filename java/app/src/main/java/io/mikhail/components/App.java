package io.mikhail.components;

import java.io.IOException;
import com.pulumi.provider.internal.Metadata;
import com.pulumi.provider.internal.ComponentProviderHost;

public class App {
    public static void main(String[] args) throws IOException, InterruptedException {
		new ComponentProviderHost(new Metadata("java-components"), App.class.getPackage()).start(args);
    }
}
