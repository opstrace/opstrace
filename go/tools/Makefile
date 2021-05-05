all: cortex alertmanager loki

cortex:
	cd cortex-jsonschema-exporter && go mod download && (go run main.go > schema.json)

alertmanager:
	cd alertmanager-jsonschema-exporter && go mod download && (go run main.go > schema.json)

loki:
	cd loki-jsonschema-exporter && go mod download && (go run main.go > schema.json)
