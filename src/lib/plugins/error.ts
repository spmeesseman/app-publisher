
class AppPublisherError extends Error
{
    code: any;
    details: string;
    appPublisher: boolean;

    constructor(message: string, code: any, details: string)
    {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = "AppPublisherError";
        this.code = code;
        this.details = details;
        this.appPublisher = true;
    }
}

export = AppPublisherError;
