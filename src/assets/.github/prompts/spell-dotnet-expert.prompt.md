---
name: Spell — .NET Expert
description: Load .NET best practices and patterns for any development agent working on .NET projects
argument-hint: Specific .NET topic or question (e.g., "Azure Functions isolated worker", "EF Core migrations")
agent: agent
---

## Executive Summary

- This prompt loads .NET expertise into any agent's context — no dedicated .NET agent needed, per your org's decision/security log if one exists.
- Covers .NET 10, ASP.NET Core, Azure Functions (isolated worker), Entity Framework Core, and xUnit testing.
- Use this when any dev agent is working on `{BUSINESS_NAME}` or other .NET projects. (`{BUSINESS_NAME}`: resolve from `.arcane.json` / the feature or PRD frontmatter; ask if unset.) For the dev-agent roster, reference [[agent-policies]] / [[naming-conventions]] rather than assuming specific personas.
- Combines with `spell-implement` for .NET-specific autonomous development loops.

---

Load .NET expert context and assist with the specified topic.

Context to apply:

### .NET Project Standards

- **Target Framework:** .NET 10 (latest LTS)
- **API Pattern:** ASP.NET Core Minimal APIs (preferred) or Controllers (existing projects)
- **Serverless:** Azure Functions v4 isolated worker model (NOT in-process)
- **ORM:** Entity Framework Core with code-first migrations
- **Testing:** xUnit + FluentAssertions + Moq (or NSubstitute)
- **DI:** Built-in Microsoft.Extensions.DependencyInjection
- **Logging:** Serilog with structured logging (JSON output)
- **Configuration:** Options pattern (`IOptions<T>`) — never read config directly

### Code Patterns

```csharp
// Minimal API pattern
app.MapGet("/api/items/{id}", async (int id, IItemService service) =>
{
    var item = await service.GetByIdAsync(id);
    return item is null ? Results.NotFound() : Results.Ok(item);
});

// Service registration
builder.Services.AddScoped<IItemService, ItemService>();
builder.Services.Configure<ItemOptions>(builder.Configuration.GetSection("Items"));

// Azure Function (isolated worker)
[Function("ProcessItem")]
public async Task<HttpResponseData> Run(
    [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequestData req)
{
    var item = await req.ReadFromJsonAsync<ItemRequest>();
    // Process...
    var response = req.CreateResponse(HttpStatusCode.OK);
    await response.WriteAsJsonAsync(result);
    return response;
}
```

### Testing Patterns

```csharp
// xUnit test with FluentAssertions
public class ItemServiceTests
{
    [Fact]
    public async Task GetById_WhenExists_ReturnsItem()
    {
        // Arrange
        var mockRepo = new Mock<IItemRepository>();
        mockRepo.Setup(r => r.GetByIdAsync(1))
            .ReturnsAsync(new Item { Id = 1, Name = "Test" });
        var service = new ItemService(mockRepo.Object);

        // Act
        var result = await service.GetByIdAsync(1);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Test");
    }
}
```

### Common Pitfalls to Avoid

- **Don't use `HttpClient` directly** — use `IHttpClientFactory` with named/typed clients.
- **Don't catch `Exception`** — catch specific types. Let unhandled exceptions bubble to middleware.
- **Don't use `async void`** — always `async Task`. Exception: event handlers.
- **Don't block on async** — never use `.Result` or `.Wait()`. Use `await`.
- **Don't put business logic in controllers/endpoints** — use a service layer.
- **Don't use `DateTime.Now`** — use `DateTimeOffset.UtcNow` or inject `TimeProvider`.
- **Don't store secrets in appsettings.json** — use User Secrets (dev) or Azure Key Vault (prod).

### NuGet Package Standards

Always pin exact versions. Preferred packages:
- `Microsoft.EntityFrameworkCore` — ORM
- `Serilog.AspNetCore` — logging
- `FluentValidation` — input validation
- `Polly` — resilience and retry policies
- `Mapster` or `AutoMapper` — object mapping
- `Swashbuckle.AspNetCore` — OpenAPI/Swagger

### Azure-Specific Patterns

- Use Managed Identity for Azure service authentication (no connection strings with keys).
- Use Azure Key Vault references in App Service/Functions configuration.
- Use Application Insights for telemetry (`AddApplicationInsightsTelemetry()`).
- Use Azure Storage Queue or Service Bus for async messaging (not HTTP callbacks).

Workflow:

1. **Identify the .NET topic** — what does the developer need help with?
2. **Apply the patterns above** — use the standards as constraints.
3. **Provide implementation guidance** — specific code, not just concepts.
4. **Include tests** — every code suggestion includes corresponding xUnit tests.
5. **Flag deviations** — if the existing codebase doesn't follow these patterns, note it but don't refactor without approval.
