module.exports = async function handler(req, res) {
    try {
        res.status(200).json({
            status: "success",
            envKeys: Object.keys(process.env).filter(k => !k.includes("OIDC") && !k.includes("TOKEN") && !k.includes("KEY"))
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};
