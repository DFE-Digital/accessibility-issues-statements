const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { AzureMonitorTraceExporter } = require('@azure/monitor-opentelemetry-exporter');
const { WinstonInstrumentation } = require('@opentelemetry/instrumentation-winston');

let sdk;

function initializeTelemetry() {
  if (!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    console.warn('APPLICATIONINSIGHTS_CONNECTION_STRING not set, telemetry will be disabled');
    return Promise.resolve();
  }

  sdk = new NodeSDK({
    traceExporter: new AzureMonitorTraceExporter({
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
    }),
    instrumentations: [
      getNodeAutoInstrumentations(),
      new WinstonInstrumentation()
    ]
  });

  return sdk.start()
    .then(() => {
      console.log('OpenTelemetry SDK started');
      return sdk;
    })
    .catch((error) => {
      console.error('Error starting OpenTelemetry SDK:', error);
      throw error;
    });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  if (sdk) {
    sdk.shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down successfully'))
      .catch((error) => console.error('Error shutting down OpenTelemetry SDK:', error))
      .finally(() => process.exit(0));
  }
});

module.exports = {
  initializeTelemetry
}; 