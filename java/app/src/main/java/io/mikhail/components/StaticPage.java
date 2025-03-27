package io.mikhail.components;

import com.pulumi.aws.s3.*;
import com.pulumi.aws.s3.inputs.*;
import com.pulumi.core.Output;
import com.pulumi.core.annotations.Export;
import com.pulumi.resources.ComponentResource;
import com.pulumi.resources.ComponentResourceOptions;
import com.pulumi.resources.CustomResourceOptions;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;

import java.util.List;
import java.util.Map;

public class StaticPage extends ComponentResource {
	@Export
	public final Output<String> endpoint;

	public StaticPage(String name, StaticPageArgs args, ComponentResourceOptions options) {
		super("static-page-component:index:StaticPage", name, options);

		// Create a bucket
		var bucket = new BucketV2(
				name + "-bucket",
				BucketV2Args.builder().build(),
				CustomResourceOptions.builder().parent(this).build());

		// Configure bucket website
		var bucketWebsite = new BucketWebsiteConfigurationV2(
				name + "-website",
				BucketWebsiteConfigurationV2Args.builder()
						.bucket(bucket.bucket())
						.indexDocument(BucketWebsiteConfigurationV2IndexDocumentArgs.builder()
								.suffix("index.html")
								.build())
						.build(),
				CustomResourceOptions.builder().parent(bucket).build());

		// Create bucket object for index document
		var indexObject = new BucketObject(
				name + "-index-object",
				BucketObjectArgs.builder()
						.bucket(bucket.bucket())
						.key("index.html")
						.content(args.indexContent())
						.contentType("text/html")
						.build(),
				CustomResourceOptions.builder().parent(bucket).build());

		// Create public access block
		var publicAccessBlock = new BucketPublicAccessBlock(
				name + "-public-access-block",
				BucketPublicAccessBlockArgs.builder()
						.bucket(bucket.bucket())
						.blockPublicAcls(false)
						.build(),
				CustomResourceOptions.builder().parent(bucket).build());

		// Create bucket policy
		var bucketPolicy = new BucketPolicy(
				name + "-bucket-policy",
				BucketPolicyArgs.builder()
						.bucket(bucket.bucket())
						.policy(bucket.bucket().applyValue(bucketName -> {
							var policy = Map.of(
									"Version", "2012-10-17",
									"Statement", List.of(
											Map.of(
													"Effect", "Allow",
													"Principal", "*",
													"Action", List.of("s3:GetObject"),
													"Resource", List.of(String.format("arn:aws:s3:::%s/*", bucketName))
											)
									)
							);
							try {
								return new ObjectMapper().writeValueAsString(policy);
							} catch (IOException e) {
								throw new RuntimeException("Failed to serialize policy to JSON", e);
							}
						}))
						.build(),
				CustomResourceOptions.builder()
						.parent(bucket)
						.dependsOn(publicAccessBlock)
						.build());

		this.endpoint = bucketWebsite.websiteEndpoint();

		this.registerOutputs(Map.of(
				"endpoint", this.endpoint
		));
	}
}