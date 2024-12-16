exports.handler = async (event) => {
    return {
        statusCode: 200,
        body: "Hello Lambda",
        headers: {
            "Content-Type": "text/plain"
        },
    };
};