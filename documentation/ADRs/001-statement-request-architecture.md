# ADR-001: Statement Requests

## Status

Accepted

## Context

Paytrail needs to process financial statement requests but we do not want to process this directly on our servers.

## Problem Statement

1. **Lack of Rate Limiting**: The reason we didnt just upload directly from the mobile application was because we want to be able to rate limit users so they do not make too many statement requests
2. **Performance Concerns**: Although our servers are perfectly capabale of handling statement processing, we just want our servers to be fully responsible for syncing(push/pull) alone.

## Decision

We introduce an sqs queue and offload cloud statement processing to this particular service.

### Message Flow

1. **Request Received**: API endpoint receives statement request
2. **Message Queued**: Request details sent to SQS queue
3. **Processing**: Lambda picks up message
4. **Statement Generation**: Lambda processes request and generates statement
5. **Result Handling**: On Success user is notified via email
6. **Failure Recovery**: Failed messages moved to DLQ after 2 attempts

## Benefits

1. **Performance**: Our server is responsible for syncing alone.
2. **Rate Limiting**: We gain the ability to rate limit our users, preventing them from misusing the statement request feature and increasing our AWS Bill.
3. **Decoupling**: Statement processing isolated from core application

## Trade-offs

1. **Complexity**: We now have to separately maintain the AWS infrastructure responsible for processing statement requests.
2. **Cost**: Added infrastructurre costs.
